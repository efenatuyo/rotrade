(function () {
    'use strict';
    function loadAutoTradesPage() {
        if (window.clearSendTradesUserStatsCache) {
            window.clearSendTradesUserStatsCache();
        }
        const langPrefix = window.PagesUtils ? window.PagesUtils.getLanguagePrefix() : '';
        const buildPath = window.PagesUtils
            ? window.PagesUtils.buildPath
            : (path) => (langPrefix || '') + path;
        const content = `\n            <div class="auto-trades-container">\n                <div class="auto-trades-header">\n                    <h1 class="auto-trades-title">Auto Trades</h1>\n                    <div class="control-panel">\n                        <a href="${buildPath('/trades')}" class="btn btn-primary" id="send-trades">\n                            SEND TRADES\n                        </a>\n                        <a href="${buildPath('/auto-trades/create')}" class="btn btn-success">\n                            CREATE NEW AUTO TRADE\n                        </a>\n                    </div>\n                </div>\n\n                <div class="trade-filters">\n                    <button class="filter-btn active" data-filter="auto-trades">Auto Trades</button>\n                    <button class="filter-btn" data-filter="outbound">Outbound</button>\n                    <button class="filter-btn" data-filter="expired">Declined</button>\n                    <button class="filter-btn" data-filter="completed">Completed</button>\n                </div>\n\n                <div class="content-sections">\n                    <div class="auto-trades-section" id="auto-trades-section">\n                        <div class="auto-trades-grid" id="auto-trades-container">\n                        </div>\n                    </div>\n\n                    <div class="trades-section" id="outbound-section" style="display: none;">\n                        <div class="pagination-controls" id="outbound-pagination" style="display: none;">\n                            <div class="pagination-info">\n                                <span id="outbound-pagination-current">Page 1</span>\n                                <span class="pagination-total">of <span id="outbound-pagination-total-pages">1</span></span>\n                            </div>\n                            <div class="sorting-controls">\n                                <button class="sort-btn" id="outbound-sort-btn" title="Sort by date">\n                                    <span id="outbound-sort-icon">↓</span> Oldest First\n                                </button>\n                            </div>\n                            <div class="pagination-buttons">\n                                <button class="pagination-btn" id="outbound-pagination-prev" disabled>Previous</button>\n                                <button class="pagination-btn" id="outbound-pagination-next">Next</button>\n                            </div>\n                        </div>\n                        <div class="trades-grid" id="outbound-container">\n                        </div>\n                    </div>\n\n                    <div class="trades-section" id="expired-section" style="display: none;">\n                        <div class="pagination-controls" id="expired-pagination" style="display: none;">\n                            <div class="pagination-info">\n                                <span id="expired-pagination-current">Page 1</span>\n                                <span class="pagination-total">of <span id="expired-pagination-total-pages">1</span></span>\n                            </div>\n                            <div class="sorting-controls">\n                                <button class="sort-btn" id="expired-sort-btn" title="Sort by date">\n                                    <span id="expired-sort-icon">↓</span> Oldest First\n                                </button>\n                            </div>\n                            <div class="pagination-buttons">\n                                <button class="pagination-btn" id="expired-pagination-prev" disabled>Previous</button>\n                                <button class="pagination-btn" id="expired-pagination-next">Next</button>\n                            </div>\n                        </div>\n                        <div class="trades-grid" id="expired-container">\n                        </div>\n                    </div>\n\n                    <div class="trades-section" id="completed-section" style="display: none;">\n                        <div class="pagination-controls" id="completed-pagination" style="display: none;">\n                            <div class="pagination-info">\n                                <span id="completed-pagination-current">Page 1</span>\n                                <span class="pagination-total">of <span id="completed-pagination-total-pages">1</span></span>\n                            </div>\n                            <div class="sorting-controls">\n                                <button class="sort-btn" id="completed-sort-btn" title="Sort by date">\n                                    <span id="completed-sort-icon">↓</span> Oldest First\n                                </button>\n                            </div>\n                            <div class="pagination-buttons">\n                                <button class="pagination-btn" id="completed-pagination-prev" disabled>Previous</button>\n                                <button class="pagination-btn" id="completed-pagination-next">Next</button>\n                            </div>\n                        </div>\n                        <div class="trades-grid" id="completed-container">\n                        </div>\n                    </div>\n                </div>\n\n                <div class="empty-state" id="empty-state" style="display: none;">\n                    <div class="empty-state-icon">🤖</div>\n                    <div class="empty-state-title">No Auto Trades Yet</div>\n                    <div class="empty-state-text">\n                        Create your first automated trade to get started.<br>\n                        Set up trades to run automatically and maximize your trading efficiency.\n                    </div>\n                </div>\n            </div>\n        `;
        UI.replacePageContent(content);
        if (window.setupAutoTradesEventListeners) {
            window.setupAutoTradesEventListeners();
        }
        Utils.nextFrame(() => {
            const activeFilterBtn = document.querySelector('.filter-btn.active');
            if (activeFilterBtn) {
                activeFilterBtn.style.setProperty('border-bottom', '3px solid white', 'important');
            }
        });
        if (window.loadAutoTradeData) {
            (async () => {
                if (window.validateAutoTradesInventory) {
                    await window.validateAutoTradesInventory();
                }
                await window.loadAutoTradeData();
                if (window.loadOutboundTrades) window.loadOutboundTrades();
                if (window.loadExpiredTrades) window.loadExpiredTrades();
                if (window.loadCompletedTrades) window.loadCompletedTrades();
                Utils.delay(500).then(async () => {
                    if (!window.rolimonData || Object.keys(window.rolimonData).length === 0) {
                        if (window.loadRolimonsData) {
                            await window.loadRolimonsData();
                        }
                    }
                    if (window.loadAutoTradeItemThumbnails) {
                        window.loadAutoTradeItemThumbnails();
                        window.loadAutoTradeItemThumbnails('outbound-container');
                        window.loadAutoTradeItemThumbnails('expired-container');
                        window.loadAutoTradeItemThumbnails('completed-container');
                    }
                });
            })();
        }
        Utils.delay(500).then(() => {
            if (window.loadAutoTradeItemThumbnails) {
                window.loadAutoTradeItemThumbnails();
            }
        });
    }
    window.PagesAutoTrades = {
        loadAutoTradesPage: loadAutoTradesPage,
    };
    window.loadAutoTradesPage = loadAutoTradesPage;
})();
