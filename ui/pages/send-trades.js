(function() {
    'use strict';

    function loadBasicSendTradesInterface() {
        const langPrefix = window.PagesUtils ? window.PagesUtils.getLanguagePrefix() : '';
        const buildPath = window.PagesUtils ? window.PagesUtils.buildPath : (path) => (langPrefix || '') + path;
        
        const content = `
            <div class="send-trades-container">
                <a href="${buildPath('/auto-trades')}" class="back-link">← Back to Auto Trades</a>
                <div class="page-header">
                    <h1>Send Trades</h1>
                    <p class="subtitle">Execute your auto-trades by sending them to available users</p>
                </div>

                <div class="trade-filter-bar" id="trade-filter-bar">
                    <div class="filter-label">Filter by Trade:</div>
                    <div class="trade-filter-chips" id="trade-filter-chips">
                    </div>
                    <div class="shuffle-controls">
                        <div class="user-stats-toggle">
                            <label class="stats-toggle-label">
                                <input type="checkbox" id="user-stats-toggle">
                                <span class="toggle-text">Show User Stats</span>
                            </label>
                        </div>
                        <div class="total-users-info" id="total-users-info">
                            Total Users: 0
                        </div>
                        <button class="shuffle-btn" id="shuffle-users-btn">
                            Shuffle Users
                        </button>
                    </div>
                </div>

                <div class="pagination-controls">
                    <div class="pagination-info">
                        <span id="pagination-current">Page 1</span>
                        <span class="pagination-total">of <span id="pagination-total-pages">1</span></span>
                    </div>
                    
                    <div class="sorting-controls">
                        <select id="sort-type" class="sort-select">
                            <option value="lastOnline">Last Online</option>
                            <option value="ownerSince">Owned Since</option>
                        </select>
                        <select id="sort-order" class="sort-select">
                            <option value="desc">Newest</option>
                            <option value="asc">Oldest</option>
                        </select>
                    </div>

                    <div class="pagination-buttons">
                        <button class="pagination-btn send-all-btn" id="send-all-trades-btn" style="background: #28a745; color: white; margin-right: 10px;">
                            Send All Trades
                        </button>
                        <button class="pagination-btn" id="pagination-prev" disabled>Previous</button>
                        <button class="pagination-btn" id="pagination-next">Next</button>
                    </div>
                </div>

                <div class="send-trades-grid" id="send-trades-grid">
                </div>
            </div>
        `;

        UI.replacePageContent(content);

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
                                warningDiv.innerHTML = `
                                    <h3 style="color: #28a745; margin-bottom: 15px;">✅ Angular Service Ready!</h3>
                                    <p style="color: #bdbebe;">Trades should work normally now. Click "SEND TRADE" on any opportunity below.</p>
                                `;

                                return;
                            }
                        }
                    }

                    testAngularBtn.textContent = '❌ Still Not Ready';
                    testAngularBtn.style.background = '#dc3545';

                    Utils.delay(3000).then(() => {
                        testAngularBtn.textContent = '🧪 Test Angular Now';
                        testAngularBtn.style.background = '#007bff';
                    });

                } catch (error) {
                    testAngularBtn.textContent = '❌ Test Failed';
                    testAngularBtn.style.background = '#dc3545';

                    Utils.delay(3000).then(() => {
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
            window.loadTradeOpportunities().then(() => {
                if (window.setupTradeFiltering) window.setupTradeFiltering();
                if (window.setupShuffleSystem) window.setupShuffleSystem();
                if (window.setupSortingSystem) window.setupSortingSystem();
                if (window.setupSendTradeButtons) window.setupSendTradeButtons();
                if (window.setupSendAllTradesButton) window.setupSendAllTradesButton();
            }).catch(error => {
            });
        }
    }

    function loadSendTradesPage() {
        loadBasicSendTradesInterface();
    }

    window.PagesSendTrades = {
        loadBasicSendTradesInterface,
        loadSendTradesPage
    };

    window.loadBasicSendTradesInterface = loadBasicSendTradesInterface;
    window.loadSendTradesPage = loadSendTradesPage;

})();