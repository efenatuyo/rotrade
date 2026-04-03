(function () {
    'use strict';
    function getLanguagePrefix() {
        const pathname = window.location.pathname;
        const match = pathname.match(/^\/([a-z]{2})\//);
        return match ? `/${match[1]}` : '';
    }
    function buildPath(path) {
        const langPrefix = getLanguagePrefix();
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return langPrefix + cleanPath;
    }
    function normalizePath(pathname) {
        let normalized = (pathname || '').replace(/^\/([a-z]{2})\//, '/');
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized || '/';
    }
    function detectAndApplyTheme() {
        const isDarkMode =
            document.body.classList.contains('dark-theme') ||
            document.documentElement.classList.contains('dark-theme') ||
            document.querySelector('[data-theme="dark"]') ||
            window.getComputedStyle(document.body).backgroundColor.includes('rgb(35, 37, 39)') ||
            window.getComputedStyle(document.body).backgroundColor.includes('rgb(25, 27, 28)');
        const root = document.documentElement;
        if (isDarkMode) {
            root.style.setProperty('--auto-trades-bg-primary', '#232629');
            root.style.setProperty('--auto-trades-bg-secondary', '#1e2023');
            root.style.setProperty('--auto-trades-border', '#393b3d');
            root.style.setProperty('--auto-trades-text-primary', '#ffffff');
            root.style.setProperty('--auto-trades-text-secondary', '#bdbebe');
            root.style.setProperty('--auto-trades-text-muted', '#858585');
        } else {
            root.style.setProperty('--auto-trades-bg-primary', '#ffffff');
            root.style.setProperty('--auto-trades-bg-secondary', '#f5f5f5');
            root.style.setProperty('--auto-trades-border', '#e0e0e0');
            root.style.setProperty('--auto-trades-text-primary', '#191919');
            root.style.setProperty('--auto-trades-text-secondary', '#666666');
            root.style.setProperty('--auto-trades-text-muted', '#999999');
        }
    }
    function addAutoTradesTab() {
        const tradeLink = document.querySelector('a[href*="/trades"], a[id="nav-trade"]');
        if (tradeLink) {
            const existingAutoTrades = document.querySelector('#nav-auto-trades');
            if (existingAutoTrades) return;
            const langPrefix = getLanguagePrefix();
            const autoTradesPath = buildPath('/auto-trades');
            const autoTradesLink = document.createElement('li');
            autoTradesLink.style.display = 'block';
            autoTradesLink.innerHTML = `\n                <a class="dynamic-overflow-container text-nav" href="${autoTradesPath}" id="nav-auto-trades" target="_self">\n                    <div><span class="icon-nav-trade"></span></div>\n                    <span class="font-header-2 dynamic-ellipsis-item" title="Auto Trades">Auto Trades</span>\n                </a>\n            `;
            const tradeListItem = tradeLink.closest('li');
            if (tradeListItem && tradeListItem.parentNode) {
                tradeListItem.parentNode.insertBefore(autoTradesLink, tradeListItem);
            }
        }
    }
    function handleRouting() {
        const currentPath = window.location.pathname;
        const normalizedPath = normalizePath(currentPath);
        if (normalizedPath === '/auto-trades/settings') {
            window.location.replace(buildPath('/auto-trades'));
            return;
        }
        const currentHash = window.location.hash;
        const shouldLoadSendTrades = sessionStorage.getItem('loadSendTrades') === 'true';
        if (
            (normalizedPath === '/auto-trades' ||
                normalizedPath.startsWith('/auto-trades/') ||
                normalizedPath === '/trades') &&
            currentPath === normalizedPath &&
            !currentPath.match(/^\/[a-z]{2}\//)
        ) {
            const htmlLang =
                document.documentElement.lang ||
                navigator.language ||
                navigator.userLanguage ||
                'en';
            const langCode = htmlLang.split('-')[0].split('_')[0].toLowerCase();
            if (langCode && langCode.length === 2 && langCode !== 'en') {
                window.location.href = `/${langCode}${currentPath}`;
                return;
            }
        }
        detectAndApplyTheme();
        if (normalizedPath === '/auto-trades') {
            document.body.classList.add('path-auto-trades');
            if (window.loadAutoTradesPage) {
                window.loadAutoTradesPage();
            } else {
                setTimeout(() => {
                    if (window.loadAutoTradesPage) {
                        window.loadAutoTradesPage();
                    }
                }, 100);
            }
        } else if (normalizedPath === '/auto-trades/create') {
            document.body.classList.add('path-auto-trades-create');
            if (window.loadCreateTradePage) {
                window.loadCreateTradePage();
            } else {
                setTimeout(() => {
                    if (window.loadCreateTradePage) {
                        window.loadCreateTradePage();
                    }
                }, 100);
            }
        } else if (normalizedPath === '/trades' && shouldLoadSendTrades) {
            sessionStorage.removeItem('loadSendTrades');
            document.body.classList.add('path-auto-trades-send');
            if (window.loadSendTradesPage) {
                window.loadSendTradesPage();
            } else {
                setTimeout(() => {
                    if (window.loadSendTradesPage) {
                        window.loadSendTradesPage();
                    }
                }, 100);
            }
        } else if (normalizedPath === '/trades' && currentHash === '#/auto-trades-send') {
            document.body.classList.add('path-auto-trades-send');
            if (window.loadSendTradesPage) {
                window.loadSendTradesPage();
            } else {
                setTimeout(() => {
                    if (window.loadSendTradesPage) {
                        window.loadSendTradesPage();
                    }
                }, 100);
            }
        } else if (normalizedPath === '/auto-trades/send') {
            sessionStorage.setItem('loadSendTrades', 'true');
            window.location.href = buildPath('/trades');
        } else if (normalizedPath.startsWith('/proofs/')) {
            const afterProofs = normalizedPath.slice('/proofs/'.length);
            let pathSegment = (afterProofs.split('/')[0] || '').trim();
            try {
                pathSegment = decodeURIComponent(pathSegment);
            } catch {}
            const pathIsNumericOnly = pathSegment && /^\d+$/.test(pathSegment);
            let itemId = null;
            let itemName = null;
            if (pathIsNumericOnly) {
                itemId = pathSegment;
            } else if (pathSegment) {
                itemName = pathSegment;
            }
            document.body.classList.add('path-proofs');
            if ((itemId || itemName) && window.loadProofsPage) {
                window.loadProofsPage(itemId, itemName);
            } else if (itemId || itemName) {
                setTimeout(() => {
                    if (window.loadProofsPage) {
                        window.loadProofsPage(itemId, itemName);
                    }
                }, 100);
            }
        } else {
            document.body.classList.remove(
                'path-auto-trades',
                'path-auto-trades-create',
                'path-auto-trades-send',
                'path-proofs'
            );
        }
    }
    window.Routing = {
        handleRouting: handleRouting,
        addAutoTradesTab: addAutoTradesTab,
        detectAndApplyTheme: detectAndApplyTheme,
        getLanguagePrefix: getLanguagePrefix,
        buildPath: buildPath,
        normalizePath: normalizePath,
    };
})();
