(function() {
    'use strict';

    function detectAndApplyTheme() {
        const isDarkMode = document.body.classList.contains('dark-theme') ||
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
        const tradeLink = document.querySelector('a[href="https://www.roblox.com/trades"]');
        if (tradeLink) {
            const existingAutoTrades = document.querySelector('#nav-auto-trades');
            if (existingAutoTrades) return;

            const autoTradesLink = document.createElement('li');
            autoTradesLink.style.display = 'block';
            autoTradesLink.innerHTML = `
                <a class="dynamic-overflow-container text-nav" href="/auto-trades" id="nav-auto-trades" target="_self">
                    <div><span class="icon-nav-trade"></span></div>
                    <span class="font-header-2 dynamic-ellipsis-item" title="Auto Trades">Auto Trades</span>
                </a>
            `;

            const tradeListItem = tradeLink.closest('li');
            if (tradeListItem && tradeListItem.parentNode) {
                tradeListItem.parentNode.insertBefore(autoTradesLink, tradeListItem);
            }
        }
    }

    function handleRouting() {
        const currentPath = window.location.pathname;
        const currentHash = window.location.hash;
        const shouldLoadSendTrades = sessionStorage.getItem('loadSendTrades') === 'true';

        detectAndApplyTheme();

        if (currentPath === '/auto-trades') {
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
        } else if (currentPath === '/auto-trades/create') {
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
        } else if (currentPath === '/auto-trades/settings') {
            document.body.classList.add('path-auto-trades-settings');
            if (window.loadSettingsPage) {
                window.loadSettingsPage();
            } else {
                setTimeout(() => {
                    if (window.loadSettingsPage) {
                        window.loadSettingsPage();
                    }
                }, 100);
            }
        } else if (currentPath === '/trades' && shouldLoadSendTrades) {
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
        } else if (currentPath === '/trades' && currentHash === '#/auto-trades-send') {
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
        } else if (currentPath === '/auto-trades/send') {
            sessionStorage.setItem('loadSendTrades', 'true');
            window.location.href = '/trades';
        } else if (currentPath.match(/^\/proofs\/(\d+)$/)) {
            const match = currentPath.match(/^\/proofs\/(\d+)$/);
            const itemId = match ? match[1] : null;
            document.body.classList.add('path-proofs');
            if (itemId && window.loadProofsPage) {
                window.loadProofsPage(itemId);
            } else if (itemId) {
                setTimeout(() => {
                    if (window.loadProofsPage) {
                        window.loadProofsPage(itemId);
                    }
                }, 100);
            }
        } else {
            document.body.classList.remove('path-auto-trades', 'path-auto-trades-create', 'path-auto-trades-send', 'path-proofs');
        }
    }

    window.Routing = {
        handleRouting,
        addAutoTradesTab,
        detectAndApplyTheme
    };
})();
