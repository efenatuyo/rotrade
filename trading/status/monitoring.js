(function () {
    'use strict';
    const STATUS_INTERVAL_MS = 30 * 1e3;
    const UPDATE_INTERVAL_MS = 30 * 1e3;
    function runStatusCheck() {
        if (window.checkRobloxTradeStatuses) {
            window.checkRobloxTradeStatuses().catch(() => {});
        }
    }
    function runAutoUpdate() {
        if (window.checkRobloxTradeStatuses) {
            window.checkRobloxTradeStatuses().catch(() => {});
        }
        const isAutoTradesPage =
            document.body.classList.contains('path-auto-trades') ||
            document.body.classList.contains('path-auto-trades-send');
        if (!isAutoTradesPage) return;
        const activeTab = window.RobloxSelectors
            ? window.RobloxSelectors.find('tradeFilterChipActive')
            : document.querySelector('.filter-btn.active');
        if (!activeTab) return;
        const filter = activeTab.getAttribute('data-filter');
        switch (filter) {
            case 'outbound':
                if (typeof TradeLoading.loadOutboundTrades === 'function') {
                    TradeLoading.loadOutboundTrades();
                }
                break;
            case 'expired':
                if (typeof TradeLoading.loadExpiredTrades === 'function') {
                    TradeLoading.loadExpiredTrades();
                }
                break;
            case 'completed':
                if (typeof TradeLoading.loadCompletedTrades === 'function') {
                    TradeLoading.loadCompletedTrades();
                }
                break;
        }
        setTimeout(() => {
            const activeContainer = window.RobloxSelectors
                ? window.RobloxSelectors.find('tradesGridVisible')
                : document.querySelector('.trades-grid[style*="block"]');
            if (activeContainer) {
                const containerId = activeContainer.id;
                if (
                    typeof TradeDisplay &&
                    TradeDisplay.loadEnhancedTradeItemThumbnails === 'function'
                ) {
                    TradeDisplay.loadEnhancedTradeItemThumbnails(containerId);
                }
            }
        }, 1e3);
    }
    function startTradeStatusMonitoring() {
        runStatusCheck();
        if (window.Scheduler) {
            window.Scheduler.everyVisible('tradeStatusCheck', STATUS_INTERVAL_MS, runStatusCheck);
        } else {
            const id = setInterval(runStatusCheck, STATUS_INTERVAL_MS);
            window.tradeStatusIntervals = window.tradeStatusIntervals || new Set();
            window.tradeStatusIntervals.add(id);
        }
    }
    function startAutoUpdateSystem() {
        if (window.Scheduler) {
            window.Scheduler.everyVisible('autoUpdate', UPDATE_INTERVAL_MS, runAutoUpdate);
        } else {
            window.autoUpdateTimer = setInterval(runAutoUpdate, UPDATE_INTERVAL_MS);
            window.tradeStatusIntervals = window.tradeStatusIntervals || new Set();
            window.tradeStatusIntervals.add(window.autoUpdateTimer);
        }
    }
    window.TradeStatusMonitoring = {
        startTradeStatusMonitoring: startTradeStatusMonitoring,
        startAutoUpdateSystem: startAutoUpdateSystem,
    };
    window.startTradeStatusMonitoring = startTradeStatusMonitoring;
    window.startAutoUpdateSystem = startAutoUpdateSystem;
})();
