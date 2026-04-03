import pathlib
p = pathlib.Path(r"d:/codes_projekte/rotrade-main/content/trade-detail-context.js")
t = p.read_text(encoding="utf-8")
old = """        return null;
    }

    function buildPayload() {
        const detail = document.querySelector('.trades-list-detail');
        if (!detail) {
            return null;
        }
        const partnerLink = findPartnerUserLink(detail);
        if (!partnerLink) {
            return null;
        }
        const href = partnerLink.getAttribute('href') || partnerLink.getAttribute('ng-href') || '';
        const userMatch = href.match(/\\/users\\/(\\d+)\\b/);
        const userId = userMatch ? userMatch[1] : null;
        let username = (partnerLink.innerText || partnerLink.textContent || '').trim().replace(/\\s+/g, ' ');
        if (!username) {
            username = undefined;
        }"""
new = """        return null;
    }

    function extractPartnerUsername(partnerLink) {
        const raw = (partnerLink.innerText || partnerLink.textContent || '')
            .trim()
            .replace(/\\s+/g, ' ');
        if (!raw) {
            return undefined;
        }
        const atIdx = raw.lastIndexOf('@');
        if (atIdx !== -1) {
            const afterAt = raw.slice(atIdx + 1).trim();
            if (afterAt) {
                return afterAt;
            }
        }
        return raw;
    }

    function buildPayload() {
        const detail = document.querySelector('.trades-list-detail');
        if (!detail) {
            return null;
        }
        const partnerLink = findPartnerUserLink(detail);
        if (!partnerLink) {
            return null;
        }
        const href = partnerLink.getAttribute('href') || partnerLink.getAttribute('ng-href') || '';
        const userMatch = href.match(/\\/users\\/(\\d+)\\b/);
        const userId = userMatch ? userMatch[1] : null;
        let username = extractPartnerUsername(partnerLink);
        if (!username) {
            username = undefined;
        }"""
if old not in t:
    raise SystemExit('pattern not found')
p.write_text(t.replace(old, new), encoding="utf-8")
print('ok')
