(function() {
    'use strict';

    window.loadThumbnailsForElements = Thumbnails.loadForElements;

    window.selectInventoryItem = function(element, index) {
        element.classList.toggle('selected');
        if (window.updateTradeSummaryGlobal) {
            window.updateTradeSummaryGlobal();
        }
    };

    window.selectCatalogItem = function(element, index) {
        element.classList.toggle('selected');
        if (window.updateTradeSummaryGlobal) {
            window.updateTradeSummaryGlobal();
        }
    };

    window.loadAutoTradesPage = Pages.loadAutoTradesPage;
    window.loadCreateTradePage = Pages.loadCreateTradePage;
    window.loadSettingsPage = Pages.loadSettingsPage;

    window.setupSettingsEventListeners = EventListeners.setupSettingsEventListeners;
    window.setupAutoTradesEventListeners = EventListeners.setupAutoTradesEventListeners;
    window.setupCreateTradeEventListeners = EventListeners.setupCreateTradeEventListeners;

    window.loadAutoTradeData = TradeLoading.loadAutoTradeData;
    window.loadOutboundTrades = TradeLoading.loadOutboundTrades;
    window.loadExpiredTrades = TradeLoading.loadExpiredTrades;
    window.loadCounteredTrades = TradeLoading.loadCounteredTrades;


    function loadAutoTradeItemThumbnails(containerId = null) {
        let containerSelector;
        if (containerId) {
            containerSelector = `#${containerId}`;
        } else {
            containerSelector = '.auto-trades-container';
        }

        const container = document.querySelector(containerSelector);
        if (!container) {
            return;
        }

        if (!window.thumbnailCache) {
            window.thumbnailCache = {};
            try {
                const stored = localStorage.getItem('thumbnailCache');
                if (stored) {
                    window.thumbnailCache = JSON.parse(stored);
                }
            } catch {}
        }

        if (!window.Thumbnails || !window.Thumbnails.loadForElements) {
            if (window.Thumbnails && window.Thumbnails.init) {
                window.Thumbnails.init();
            }
        }

        const itemIcons = container.querySelectorAll('.item-icon:not(.robux-icon):not([style*="background: #00A2FF"]):not([style*="background: #00d26a"])');
        
        if (itemIcons.length === 0) {
            return;
        }

        if (window.Thumbnails && window.Thumbnails.loadForElements) {
            window.Thumbnails.loadForElements(Array.from(itemIcons));
        }
    }

    window.loadAutoTradeItemThumbnails = loadAutoTradeItemThumbnails;

    async function loadRolimonsData() {
        return Inventory.loadRolimonsData();
    }

    async function loadInventoryData() {
        return Inventory.loadInventoryData();
    }

    function getCurrentUserId() {
        return Inventory.getCurrentUserId();
    }

    async function getCurrentUserIdAsync() {
        return Inventory.getCurrentUserIdAsync ? await Inventory.getCurrentUserIdAsync() : Inventory.getCurrentUserId();
    }

    async function getUserCollectibles(userId) {
        return Inventory.getUserCollectibles(userId);
    }

    async function loadCatalogData() {
        return Inventory.loadCatalogData();
    }

    window.loadRolimonsData = loadRolimonsData;
    window.loadInventoryData = loadInventoryData;
    window.loadCatalogData = loadCatalogData;
    window.filterInventory = Inventory.filterInventory;
    window.filterCatalog = Inventory.filterCatalog;

    const updateTradeSummary = TradeSummary.updateTradeSummary;
    window.updateTradeSummaryGlobal = updateTradeSummary;
    if (window.TradeSummary && window.TradeSummary.updateTradeSummaryInternal) {
        window.updateTradeSummaryGlobalImmediate = window.TradeSummary.updateTradeSummaryInternal;
    }

    window.loadCompletedTrades = TradeLoading.loadCompletedTrades;
    window.loadSendTradesPage = Pages.loadSendTradesPage;
    window.setupSendTradesEventListeners = EventListeners.setupSendTradesEventListeners;
    window.loadBasicSendTradesInterface = Pages.loadBasicSendTradesInterface;

})();