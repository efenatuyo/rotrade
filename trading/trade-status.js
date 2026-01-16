(function() {
    'use strict';

    window.TradeStatus = {
        get checkTradeStatus() { return window.checkTradeStatus; },
        get updateTradeStatuses() { return window.updateTradeStatuses; },
        get startTradeStatusMonitoring() { return window.startTradeStatusMonitoring; },
        get checkAndUpdateTradeStatuses() { return window.checkAndUpdateTradeStatuses; },
        get moveTradeToFinalized() { return window.moveTradeToFinalized; },
        get startAutoUpdateSystem() { return window.startAutoUpdateSystem; },
        get checkRobloxTradeStatuses() { return window.checkRobloxTradeStatuses; },
        get cleanupTradeCategories() { return window.cleanupTradeCategories; },
        get showTradeNotification() { return window.showTradeNotification; }
    };

})();