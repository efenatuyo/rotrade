(function() {
    'use strict';

    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;
    const TradeNotificationQueue = window.ModuleRegistry?.getSafe('TradeNotificationQueue') || window.TradeNotificationQueue;
    const TradeNotifications = window.ModuleRegistry?.getSafe('TradeNotifications') || window.TradeStatusNotifications || { showTradeNotification: window.showTradeNotification };

    function moveTradeToFinalized(trade, status) {
        let pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
        const wasPending = pendingTrades.some(t => t.id === trade.id);
        pendingTrades = pendingTrades.filter(t => t.id !== trade.id);
        Storage.setAccount('pendingExtensionTrades', pendingTrades);

        const finalizedTrades = Storage.getAccount('finalizedExtensionTrades', []);
        const existingIndex = finalizedTrades.findIndex(t => t.id === trade.id);
        
        const finalizedTrade = {
            ...trade,
            status: status,
            finalizedAt: Date.now()
        };

        if (existingIndex >= 0) {
            finalizedTrades[existingIndex] = finalizedTrade;
        } else {
            finalizedTrades.push(finalizedTrade);
        }
        Storage.setAccount('finalizedExtensionTrades', finalizedTrades);

        if (wasPending && (status === 'completed' || status === 'accepted' || status === 'countered' || status === 'declined')) {
            if (status === 'declined' && trade.userDeclined === true) {
                return;
            }
            if (TradeNotifications && TradeNotifications.showTradeNotification) {
                TradeNotifications.showTradeNotification(trade, status);
            } else if (window.showTradeNotification) {
                window.showTradeNotification(trade, status);
            }
        }

        const outboundSection = document.getElementById('outbound-section');
        if (outboundSection && outboundSection.style.display === 'block') {
            setTimeout(() => {
                if (typeof TradeLoading.loadOutboundTrades === 'function') {
                    TradeLoading.loadOutboundTrades();
                }
            }, 500);
        }
    }

    function processStatusUpdates(pendingTrades, tradeStatusMap) {
        const finalizedTrades = Storage.getAccount('finalizedExtensionTrades', []);
        const stillPending = [];
        const movedTrades = [];

        for (const trade of pendingTrades) {
            const tradeId = String(trade.id).trim();
            const robloxStatus = tradeStatusMap.get(tradeId);
            
            if (!robloxStatus) {
                stillPending.push(trade);
                continue;
            }

            const normalizedStatus = robloxStatus.trim().toLowerCase();
            
            if (normalizedStatus === 'open') {
                stillPending.push(trade);
            } else {
                const finalizedTrade = {
                    ...trade,
                    status: normalizedStatus,
                    finalizedAt: Date.now(),
                    robloxStatus: robloxStatus,
                    giving: Array.isArray(trade.giving) ? trade.giving : [],
                    receiving: Array.isArray(trade.receiving) ? trade.receiving : [],
                    robuxGive: Number(trade.robuxGive) || 0,
                    robuxGet: Number(trade.robuxGet) || 0
                };
                finalizedTrades.push(finalizedTrade);
                movedTrades.push(finalizedTrade);
            }
        }

        return { stillPending, finalizedTrades, movedTrades };
    }

    function notifyAndRefreshUI(movedTrades) {
        const notifiedSet = new Set();
        
        movedTrades.forEach(trade => {
            const tradeId = String(trade.id || '').trim();
            const status = trade.status || '';
            const notificationKey = `${tradeId}-${status}`;
            
            if (notifiedSet.has(notificationKey)) {
                return;
            }
            
            notifiedSet.add(notificationKey);
            
            const shouldNotify = ['completed', 'accepted', 'countered', 'declined'].includes(status);
            if (shouldNotify) {
                if (status === 'declined' && trade.userDeclined === true) {
                    return;
                }
                
                if (TradeNotificationQueue && TradeNotificationQueue.queueNotification) {
                    TradeNotificationQueue.queueNotification(trade, status);
                } else if (TradeNotifications && TradeNotifications.showTradeNotification) {
                    TradeNotifications.showTradeNotification(trade, status);
                } else if (window.showTradeNotification) {
                    window.showTradeNotification(trade, status);
                }
            }
        });

        const activeTab = document.querySelector('.filter-btn.active');
        const currentFilter = activeTab ? activeTab.getAttribute('data-filter') : null;

        if (typeof TradeLoading.loadOutboundTrades === 'function') {
            TradeLoading.loadOutboundTrades();
        }
        if (typeof TradeLoading.loadExpiredTrades === 'function') {
            TradeLoading.loadExpiredTrades();
        }
        if (typeof TradeLoading.loadCompletedTrades === 'function') {
            TradeLoading.loadCompletedTrades();
        }
        if (typeof TradeLoading.loadCounteredTrades === 'function') {
            TradeLoading.loadCounteredTrades();
        }
    }

    window.TradeStatusTrades = {
        moveTradeToFinalized,
        processStatusUpdates,
        notifyAndRefreshUI
    };

    window.moveTradeToFinalized = moveTradeToFinalized;

})();