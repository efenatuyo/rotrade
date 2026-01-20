(function() {
    'use strict';

    function loadAutoTradesPage() {
        const content = `
            <div class="auto-trades-container">
                <div class="auto-trades-header">
                    <h1 class="auto-trades-title">Auto Trades</h1>
                    <div class="control-panel">
                        <a href="/auto-trades/settings" class="btn btn-secondary">
                            SETTINGS
                        </a>
                        <a href="/trades" class="btn btn-primary" id="send-trades">
                            SEND TRADES
                        </a>
                        <a href="/auto-trades/create" class="btn btn-success">
                            CREATE NEW AUTO TRADE
                        </a>
                    </div>
                </div>

                <div class="trade-filters">
                    <button class="filter-btn active" data-filter="auto-trades">Auto Trades</button>
                    <button class="filter-btn" data-filter="outbound">Outbound</button>
                    <button class="filter-btn" data-filter="expired">Declined</button>
                    <button class="filter-btn" data-filter="countered">Countered</button>
                    <button class="filter-btn" data-filter="completed">Completed</button>
                </div>

                <div class="content-sections">
                    <div class="auto-trades-section" id="auto-trades-section">
                        <div class="auto-trades-grid" id="auto-trades-container">
                        </div>
                    </div>

                    <div class="trades-section" id="outbound-section" style="display: none;">
                        <div class="pagination-controls" id="outbound-pagination" style="display: none;">
                            <div class="pagination-info">
                                <span id="outbound-pagination-current">Page 1</span>
                                <span class="pagination-total">of <span id="outbound-pagination-total-pages">1</span></span>
                            </div>
                            <div class="sorting-controls">
                                <button class="sort-btn" id="outbound-sort-btn" title="Sort by date">
                                    <span id="outbound-sort-icon">↓</span> Oldest First
                                </button>
                            </div>
                            <div class="pagination-buttons">
                                <button class="pagination-btn" id="outbound-pagination-prev" disabled>Previous</button>
                                <button class="pagination-btn" id="outbound-pagination-next">Next</button>
                            </div>
                        </div>
                        <div class="trades-grid" id="outbound-container">
                        </div>
                    </div>

                    <div class="trades-section" id="expired-section" style="display: none;">
                        <div class="pagination-controls" id="expired-pagination" style="display: none;">
                            <div class="pagination-info">
                                <span id="expired-pagination-current">Page 1</span>
                                <span class="pagination-total">of <span id="expired-pagination-total-pages">1</span></span>
                            </div>
                            <div class="sorting-controls">
                                <button class="sort-btn" id="expired-sort-btn" title="Sort by date">
                                    <span id="expired-sort-icon">↓</span> Oldest First
                                </button>
                            </div>
                            <div class="pagination-buttons">
                                <button class="pagination-btn" id="expired-pagination-prev" disabled>Previous</button>
                                <button class="pagination-btn" id="expired-pagination-next">Next</button>
                            </div>
                        </div>
                        <div class="trades-grid" id="expired-container">
                        </div>
                    </div>

                    <div class="trades-section" id="countered-section" style="display: none;">
                        <div class="pagination-controls" id="countered-pagination" style="display: none;">
                            <div class="pagination-info">
                                <span id="countered-pagination-current">Page 1</span>
                                <span class="pagination-total">of <span id="countered-pagination-total-pages">1</span></span>
                            </div>
                            <div class="sorting-controls">
                                <button class="sort-btn" id="countered-sort-btn" title="Sort by date">
                                    <span id="countered-sort-icon">↓</span> Oldest First
                                </button>
                            </div>
                            <div class="pagination-buttons">
                                <button class="pagination-btn" id="countered-pagination-prev" disabled>Previous</button>
                                <button class="pagination-btn" id="countered-pagination-next">Next</button>
                            </div>
                        </div>
                        <div class="trades-grid" id="countered-container">
                        </div>
                    </div>

                    <div class="trades-section" id="completed-section" style="display: none;">
                        <div class="pagination-controls" id="completed-pagination" style="display: none;">
                            <div class="pagination-info">
                                <span id="completed-pagination-current">Page 1</span>
                                <span class="pagination-total">of <span id="completed-pagination-total-pages">1</span></span>
                            </div>
                            <div class="sorting-controls">
                                <button class="sort-btn" id="completed-sort-btn" title="Sort by date">
                                    <span id="completed-sort-icon">↓</span> Oldest First
                                </button>
                            </div>
                            <div class="pagination-buttons">
                                <button class="pagination-btn" id="completed-pagination-prev" disabled>Previous</button>
                                <button class="pagination-btn" id="completed-pagination-next">Next</button>
                            </div>
                        </div>
                        <div class="trades-grid" id="completed-container">
                        </div>
                    </div>
                </div>

                <div class="empty-state" id="empty-state" style="display: none;">
                    <div class="empty-state-icon">🤖</div>
                    <div class="empty-state-title">No Auto Trades Yet</div>
                    <div class="empty-state-text">
                        Create your first automated trade to get started.<br>
                        Set up trades to run automatically and maximize your trading efficiency.
                    </div>
                </div>
            </div>
        `;

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
        loadAutoTradesPage
    };

    window.loadAutoTradesPage = loadAutoTradesPage;

})();