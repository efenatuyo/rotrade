import * as esbuild from 'esbuild';

import { readFile, writeFile, rm, mkdir, copyFile, readdir } from 'fs/promises';

import { dirname, join, relative, resolve } from 'path';

import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const root = join(__dirname, '..');

const dist = join(root, 'dist');

const CONTENT_BUNDLE = 'content-scripts.bundle.js';

async function walkFiles(dir) {
    const out = [];
    const entries = await readdir(dir, {
        withFileTypes: true,
    });
    for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
            out.push(...(await walkFiles(p)));
        } else {
            out.push(p);
        }
    }
    return out;
}

async function ensureDir(filePath) {
    await mkdir(dirname(filePath), {
        recursive: true,
    });
}

async function minifyJsCode(code) {
    const result = await esbuild.transform(code, {
        loader: 'js',
        minify: true,
        legalComments: 'none',
        target: 'es2018',
    });
    return result.code;
}

async function minifyCssCode(code) {
    const result = await esbuild.transform(code, {
        loader: 'css',
        minify: true,
    });
    return result.code;
}

function concatScripts(parts) {
    return parts.filter(Boolean).join('\n;\n');
}

async function readManifest() {
    const raw = await readFile(join(root, 'manifest.json'), 'utf8');
    return JSON.parse(raw);
}

function stripImportScripts(backgroundSource) {
    return backgroundSource
        .split('\n')
        .filter((line) => !/^\s*importScripts\s*\(/.test(line))
        .join('\n')
        .trim();
}

async function parseBackgroundParts() {
    const bgPath = join(root, 'background', 'background.js');
    const src = await readFile(bgPath, 'utf8');
    const bgDir = dirname(bgPath);
    const importPaths = [];
    const importRe = /importScripts\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = importRe.exec(src))) {
        const abs = resolve(bgDir, m[1]);
        importPaths.push(abs);
    }
    const main = stripImportScripts(src);
    return {
        importPaths: importPaths,
        main: main,
    };
}

async function buildContentBundle(contentJsRelPaths) {
    const chunks = [];
    for (const rel of contentJsRelPaths) {
        const abs = join(root, rel);
        chunks.push(await readFile(abs, 'utf8'));
    }
    const merged = concatScripts(chunks);
    return minifyJsCode(merged);
}

async function buildBackgroundBundle() {
    const { importPaths: importPaths, main: main } = await parseBackgroundParts();
    const chunks = [];
    for (const abs of importPaths) {
        chunks.push(await readFile(abs, 'utf8'));
    }
    chunks.push(main);
    const merged = concatScripts(chunks);
    return minifyJsCode(merged);
}

async function copyAssetsMinified() {
    const assetsDir = join(root, 'assets');
    const files = await walkFiles(assetsDir);
    for (const abs of files) {
        const rel = relative(assetsDir, abs);
        const dest = join(dist, 'assets', rel);
        await ensureDir(dest);
        const lower = abs.toLowerCase();
        if (lower.endsWith('.js')) {
            const code = await readFile(abs, 'utf8');
            await writeFile(dest, await minifyJsCode(code), 'utf8');
        } else if (lower.endsWith('.css')) {
            const code = await readFile(abs, 'utf8');
            await writeFile(dest, await minifyCssCode(code), 'utf8');
        } else {
            await copyFile(abs, dest);
        }
    }
}

async function copyMinJs(srcRel, destRel) {
    const code = await readFile(join(root, srcRel), 'utf8');
    await ensureDir(join(dist, destRel));
    await writeFile(join(dist, destRel), await minifyJsCode(code), 'utf8');
}

async function copyPopup() {
    const uiDir = join(root, 'ui');
    await ensureDir(join(dist, 'ui', 'popup.html'));
    await copyFile(join(uiDir, 'popup.html'), join(dist, 'ui', 'popup.html'));
    const css = await readFile(join(uiDir, 'popup.css'), 'utf8');
    await writeFile(join(dist, 'ui', 'popup.css'), await minifyCssCode(css), 'utf8');
    const popupJs = await readFile(join(uiDir, 'popup.js'), 'utf8');
    await writeFile(join(dist, 'ui', 'popup.js'), await minifyJsCode(popupJs), 'utf8');
    await copyMinJs('ui/dialogs-2fa.js', 'ui/dialogs-2fa.js');
    await copyMinJs('core/storage.js', 'core/storage.js');
    await copyMinJs('core/utils/authenticator.js', 'core/utils/authenticator.js');
}

async function copyExtraContentScripts(manifest) {
    const scripts = Array.isArray(manifest.content_scripts) ? manifest.content_scripts : [];
    for (let i = 1; i < scripts.length; i++) {
        const cs = scripts[i] || {};
        const jsList = Array.isArray(cs.js) ? cs.js : [];
        for (const rel of jsList) {
            await copyMinJs(rel, rel);
        }
        const cssList = Array.isArray(cs.css) ? cs.css : [];
        for (const rel of cssList) {
            const src = join(root, rel);
            const dest = join(dist, rel);
            await ensureDir(dest);
            const css = await readFile(src, 'utf8');
            await writeFile(dest, await minifyCssCode(css), 'utf8');
        }
    }
}

async function writeDistManifest(manifest) {
    const out = structuredClone(manifest);
    const cs = out.content_scripts?.[0];
    if (cs) {
        cs.js = [CONTENT_BUNDLE];
    }
    const text = JSON.stringify(out, null, 4) + '\n';
    await writeFile(join(dist, 'manifest.json'), text, 'utf8');
}

async function copyOptionalRoot(name) {
    try {
        await copyFile(join(root, name), join(dist, name));
    } catch {
        void 0;
    }
}

async function main() {
    await rm(dist, {
        recursive: true,
        force: true,
    });
    await mkdir(dist, {
        recursive: true,
    });
    const manifest = await readManifest();
    const contentList = manifest.content_scripts?.[0]?.js;
    if (!Array.isArray(contentList) || contentList.length === 0) {
        throw new Error('manifest.json: missing content_scripts[0].js array');
    }
    const [contentBundle, backgroundBundle] = await Promise.all([
        buildContentBundle(contentList),
        buildBackgroundBundle(),
    ]);
    await writeFile(join(dist, CONTENT_BUNDLE), contentBundle, 'utf8');
    await ensureDir(join(dist, 'background', 'background.js'));
    await writeFile(join(dist, 'background', 'background.js'), backgroundBundle, 'utf8');
    await writeDistManifest(manifest);
    await copyExtraContentScripts(manifest);
    await copyAssetsMinified();
    await copyPopup();
    await copyOptionalRoot('LICENSE');
    process.stdout.write(String(dist) + '\n');
}

main().catch((err) => {
    process.stderr.write(String(err && err.stack ? err.stack : err) + '\n');
    process.exit(1);
});
