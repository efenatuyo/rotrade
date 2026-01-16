(function() {
    'use strict';

    function loadCreateTradePage() {
        const content = `
            <div class="create-trade-container">
                <a href="/auto-trades" class="back-link">
                    ← Back to Auto Trades
                </a>

                <div class="auto-trades-header">
                    <h1 class="auto-trades-title">Create Auto Trade</h1>
                </div>

                <div class="trade-builder">
                    <div class="section">
                        <div class="section-title">
                            <span class="icon-nav-inventory"></span> Your Inventory
                        </div>
                        <div class="search-bar">
                            <input type="text" class="search-input" placeholder="Search your items..." id="inventory-search">
                            <button class="btn btn-secondary">
                                <span class="icon-search"></span>
                            </button>
                        </div>
                        <div class="items-grid" id="inventory-grid">
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">
                            <span class="icon-catalog"></span> Target Items
                        </div>
                        <div class="search-bar">
                            <input type="text" class="search-input" placeholder="Search Roblox catalog..." id="catalog-search">
                            <button class="btn btn-secondary">
                                <span class="icon-search"></span>
                            </button>
                        </div>
                        <div class="items-grid" id="catalog-grid">
                        </div>
                    </div>
                </div>

                <div class="trade-summary">
                    <div class="section-title">Trade Preview</div>
                    <div class="summary-content">
                        <div class="summary-section">
                            <div class="summary-title">You Give</div>
                            <div class="summary-items" id="giving-items">
                                <div class="item-icon" style="border: 2px dashed #c6c6c6; background: transparent;">
                                    <span style="color: #999;">Select Items</span>
                                </div>
                            </div>
                        </div>
                        <div class="summary-arrow">→</div>
                        <div class="summary-section">
                            <div class="summary-title">You Get</div>
                            <div class="summary-items" id="receiving-items">
                                <div class="item-icon" style="border: 2px dashed #c6c6c6; background: transparent;">
                                    <span style="color: #999;">Select Items</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="trade-settings">
                        <div class="settings-grid">
                            <div class="setting-group">
                                <label class="setting-label">Robux You Give</label>
                                <input type="number" class="setting-input" placeholder="0" min="0" id="robux-give">
                                <div class="robux-info" id="robux-give-info" style="font-size: 12px; color: #888; margin-top: 5px;"></div>
                            </div>
                            <div class="setting-group">
                                <label class="setting-label">Robux You Want</label>
                                <input type="number" class="setting-input" placeholder="0" min="0" id="robux-get">
                                <div class="robux-info" id="robux-get-info" style="font-size: 12px; color: #888; margin-top: 5px;"></div>
                            </div>
                        </div>

                        <div class="settings-grid" style="margin-top: 15px;">
                            <div class="setting-group">
                                <label class="setting-label">Auto Trade Name</label>
                                <input type="text" class="setting-input" placeholder="Enter your trade name" id="auto-trade-name">
                            </div>
                            <div class="setting-group">
                                <label class="setting-label">Max Trades Per Day</label>
                                <input type="number" class="setting-input" value="5" min="1" max="50" id="max-trades">
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 20px;">
                            <button class="btn btn-success" id="create-auto-trade" style="font-size: 14px; padding: 12px 30px;">
                                CREATE AUTO TRADE
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        UI.replacePageContent(content);
        if (window.setupCreateTradeEventListeners) {
            window.setupCreateTradeEventListeners();
        }
        if (window.loadInventoryData) window.loadInventoryData();
        if (window.loadCatalogData) window.loadCatalogData();

        Utils.delay(1500).then(() => {
            if (window.checkForEditMode) {
                window.checkForEditMode();
            }
        });
    }

    window.PagesCreateTrade = {
        loadCreateTradePage
    };

    window.loadCreateTradePage = loadCreateTradePage;

})();