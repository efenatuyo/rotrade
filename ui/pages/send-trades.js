(function () {
    'use strict';
    function loadBasicSendTradesInterface() {
        const langPrefix = window.PagesUtils ? window.PagesUtils.getLanguagePrefix() : '';
        const buildPath = window.PagesUtils
            ? window.PagesUtils.buildPath
            : (path) => (langPrefix || '') + path;
        const content = `\n            <div class="send-trades-container">\n                <a href="${buildPath('/auto-trades')}" class="back-link">← Back to Auto Trades</a>\n                <div class="page-header">\n                    <h1>Send Trades</h1>\n                    <p class="subtitle">Execute your auto-trades by sending them to available users</p>\n                </div>\n\n                <div class="trade-filter-bar" id="trade-filter-bar">\n                    <div class="filter-label">Filter by Trade:</div>\n                    <div class="trade-filter-chips" id="trade-filter-chips">\n                    </div>\n                    <div class="shuffle-controls">\n                        <div class="user-stats-toggle">\n                            <label class="stats-toggle-label">\n                                <input type="checkbox" id="user-stats-toggle">\n                                <span class="toggle-text">Show User Stats</span>\n                            </label>\n                        </div>\n                        <div class="total-users-info" id="total-users-info">\n                            Total Users: 0\n                        </div>\n                        <button class="shuffle-btn" id="shuffle-users-btn">\n                            Shuffle Users\n                        </button>\n                    </div>\n                </div>\n\n                <div class="pagination-controls">\n                    <div class="pagination-info">\n                        <span id="pagination-current">Page 1</span>\n                        <span class="pagination-total">of <span id="pagination-total-pages">1</span></span>\n                    </div>\n                    \n                    <div class="sorting-controls">\n                        <select id="sort-type" class="sort-select">\n                            <option value="lastOnline">Last Online</option>\n                            <option value="ownerSince">Owned Since</option>\n                        </select>\n                        <select id="sort-order" class="sort-select">\n                            <option value="desc">Newest</option>\n                            <option value="asc">Oldest</option>\n                        </select>\n                    </div>\n\n                    <div class="pagination-buttons">\n                        <button class="pagination-btn send-all-btn" id="send-all-trades-btn" style="background: #28a745; color: white; margin-right: 10px;">\n                            Send All Trades\n                        </button>\n                        <button class="pagination-btn" id="pagination-prev" disabled>Previous</button>\n                        <button class="pagination-btn" id="pagination-next">Next</button>\n                    </div>\n                </div>\n\n                <div class="send-trades-grid" id="send-trades-grid">\n                </div>\n            </div>\n        `;
        UI.replacePageContent(content);
        (async () => {
            const userId = API.getCurrentUserIdSync
                ? API.getCurrentUserIdSync()
                : await API.getCurrentUserId();
            if (userId) {
                if (!window.ExtensionStorage) {
                    return;
                }
                const storageKey = '2fa_secret_' + userId;
                const encrypted = await window.Storage.get(storageKey, null);
                const hasSecret = !!(encrypted && encrypted.trim().length > 0);
                if (hasSecret) {
                    if (window.Dialogs2FA && window.Dialogs2FA.showPasswordPrompt) {
                        const validatePassword = async (password) => {
                            try {
                                const secret = await Authenticator.retrieveSecret(userId, password);
                                return !!(secret && secret.trim().length > 0);
                            } catch (error) {
                                return false;
                            }
                        };
                        const password = await window.Dialogs2FA.showPasswordPrompt(
                            'Password Required',
                            'Enter your password to use auto-confirmer. If you cancel, you will be manually prompted for 2FA codes.',
                            false,
                            validatePassword
                        );
                        if (password && window.AutoConfirmer && window.AutoConfirmer.setPassword) {
                            window.AutoConfirmer.setPassword(userId, password);
                        }
                    }
                }
            }
        })();
        const tryAgainBtn = document.getElementById('try-angular-again');
        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', () => {
                location.reload();
            });
        }
        const testAngularBtn = document.getElementById('test-angular-manual');
        if (testAngularBtn) {
            testAngularBtn.addEventListener('click', () => {
                try {
                    if (window.angular && window.angular.element) {
                        const tradesElement = document.querySelector('[trades]');
                        if (tradesElement) {
                            const injector = window.angular.element(tradesElement).injector();
                            const tradesService = injector.get('tradesService');
                            if (tradesService && tradesService.sendTrade) {
                                window.cachedAngularService = tradesService;
                                testAngularBtn.textContent = '✅ Angular Ready!';
                                testAngularBtn.style.background = '#28a745';
                                const warningDiv = testAngularBtn.parentElement;
                                warningDiv.innerHTML = `\n                                    <h3 style="color: #28a745; margin-bottom: 15px;">✅ Angular Service Ready!</h3>\n                                    <p style="color: #bdbebe;">Trades should work normally now. Click "SEND TRADE" on any opportunity below.</p>\n                                `;
                                return;
                            }
                        }
                    }
                    testAngularBtn.textContent = '❌ Still Not Ready';
                    testAngularBtn.style.background = '#dc3545';
                    Utils.delay(3e3).then(() => {
                        testAngularBtn.textContent = '🧪 Test Angular Now';
                        testAngularBtn.style.background = '#007bff';
                    });
                } catch (error) {
                    testAngularBtn.textContent = '❌ Test Failed';
                    testAngularBtn.style.background = '#dc3545';
                    Utils.delay(3e3).then(() => {
                        testAngularBtn.textContent = '🧪 Test Angular Now';
                        testAngularBtn.style.background = '#007bff';
                    });
                }
            });
        }
        if (window.setupSendTradesEventListeners) {
            window.setupSendTradesEventListeners();
        }
        if (window.loadTradeOpportunities) {
            window
                .loadTradeOpportunities()
                .then(() => {
                    if (window.setupTradeFiltering) window.setupTradeFiltering();
                    if (window.setupShuffleSystem) window.setupShuffleSystem();
                    if (window.setupSortingSystem) window.setupSortingSystem();
                    if (window.setupSendTradeButtons) window.setupSendTradeButtons();
                    if (window.setupSendAllTradesButton) window.setupSendAllTradesButton();
                    if (
                        window.shuffleUsers &&
                        window.currentOpportunities &&
                        window.currentOpportunities.length > 0
                    ) {
                        window.shuffleUsers();
                    }
                })
                .catch((error) => {});
        }
    }
    function loadSendTradesPage() {
        loadBasicSendTradesInterface();
    }
    window.PagesSendTrades = {
        loadBasicSendTradesInterface: loadBasicSendTradesInterface,
        loadSendTradesPage: loadSendTradesPage,
    };
    window.loadBasicSendTradesInterface = loadBasicSendTradesInterface;
    window.loadSendTradesPage = loadSendTradesPage;
})();
