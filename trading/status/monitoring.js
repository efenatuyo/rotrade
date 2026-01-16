(function() {
    'use strict';

    let statusCheckInterval = null;

    function startTradeStatusMonitoring() {
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
        }

        if (window.checkAndUpdateTradeStatuses) {
            window.checkAndUpdateTradeStatuses();
        }
        statusCheckInterval = setInterval(() => {
            if (window.checkAndUpdateTradeStatuses) {
                window.checkAndUpdateTradeStatuses();
            }
        }, 5 * 60 * 1000);
        if (window.tradeStatusIntervals) {
            window.tradeStatusIntervals.add(statusCheckInterval);
        } else {
            window.tradeStatusIntervals = new Set([statusCheckInterval]);
        }
    }

    function startAutoUpdateSystem() {
        const UPDATE_INTERVAL = 15 * 1000;

        if (window.autoUpdateTimer) {
            clearInterval(window.autoUpdateTimer);
            if (window.tradeStatusIntervals) {
                window.tradeStatusIntervals.delete(window.autoUpdateTimer);
            }
        }

        window.autoUpdateTimer = setInterval(() => {
            if (window.tradeStatusIntervals) {
                window.tradeStatusIntervals.add(window.autoUpdateTimer);
            } else {
                window.tradeStatusIntervals = new Set([window.autoUpdateTimer]);
            }
            const isAutoTradesPage = document.body.classList.contains('path-auto-trades') ||
                                   document.body.classList.contains('path-auto-trades-send');

            if (isAutoTradesPage) {
                if (window.checkRobloxTradeStatuses) {
                    window.checkRobloxTradeStatuses().then(movedCount => {
                    }).catch(error => {
                    });
                }

                const activeTab = document.querySelector('.filter-btn.active');
                if (activeTab) {
                    const filter = activeTab.getAttribute('data-filter');

                    switch(filter) {
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
                        case 'countered':
                            if (typeof TradeLoading.loadCounteredTrades === 'function') {
                                TradeLoading.loadCounteredTrades();
                            }
                            break;
                        case 'completed':
                            if (typeof TradeLoading.loadCompletedTrades === 'function') {
                                TradeLoading.loadCompletedTrades();
                            }
                            break;
                    }

                    setTimeout(() => {
                        const activeContainer = document.querySelector('.trades-grid[style*="block"]');
                        if (activeContainer) {
                            const containerId = activeContainer.id;
                            if (typeof TradeDisplay && TradeDisplay.loadEnhancedTradeItemThumbnails === 'function') {
                                TradeDisplay.loadEnhancedTradeItemThumbnails(containerId);
                            }
                        }
                    }, 1000);
                }
            }
        }, UPDATE_INTERVAL);
    }

    window.TradeStatusMonitoring = {
        startTradeStatusMonitoring,
        startAutoUpdateSystem
    };

    window.startTradeStatusMonitoring = startTradeStatusMonitoring;
    window.startAutoUpdateSystem = startAutoUpdateSystem;

})();