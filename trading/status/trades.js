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
        
        const normalizeTradeId = (id) => {
            if (id === null || id === undefined) return null;
            const str = String(id).trim();
            if (!str || str === 'null' || str === 'undefined') return null;
            try {
                const num = BigInt(str);
                return { str, num: num.toString() };
            } catch {
                return { str, num: str };
            }
        };
        
        const tradeIdsMatch = (id1, id2) => {
            const norm1 = normalizeTradeId(id1);
            const norm2 = normalizeTradeId(id2);
            if (!norm1 || !norm2) return false;
            return norm1.str === norm2.str || norm1.num === norm2.num;
        };

        for (const trade of pendingTrades) {
            const tradeId = String(trade.id).trim();
            const tradeNorm = normalizeTradeId(tradeId);
            
            let robloxStatus = tradeStatusMap.get(tradeId);
            if (!robloxStatus && tradeNorm) {
                robloxStatus = tradeStatusMap.get(tradeNorm.str) || tradeStatusMap.get(tradeNorm.num);
            }
            
            if (!robloxStatus) {
                stillPending.push(trade);
                continue;
            }

            const normalizedStatus = robloxStatus.trim().toLowerCase();
            
            if (normalizedStatus === 'open') {
                stillPending.push(trade);
            } else {
                const existingIndex = finalizedTrades.findIndex(t => tradeIdsMatch(t.id, trade.id));
                
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
                
                if (existingIndex >= 0) {
                    const existingTrade = finalizedTrades[existingIndex];
                    const statusChanged = (existingTrade.status || '').toLowerCase() !== normalizedStatus;
                    finalizedTrades[existingIndex] = finalizedTrade;
                    
                    if (statusChanged) {
                        movedTrades.push(finalizedTrade);
                    }
                } else {
                    finalizedTrades.push(finalizedTrade);
                    movedTrades.push(finalizedTrade);
                }
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
                
                try {
                    if (TradeNotificationQueue && TradeNotificationQueue.queueNotification) {
                        TradeNotificationQueue.queueNotification(trade, status);
                    } else if (TradeNotifications && TradeNotifications.showTradeNotification) {
                        TradeNotifications.showTradeNotification(trade, status);
                    } else if (window.showTradeNotification) {
                        window.showTradeNotification(trade, status);
                    } else if (window.TradeStatusNotifications && window.TradeStatusNotifications.showTradeNotification) {
                        window.TradeStatusNotifications.showTradeNotification(trade, status);
                    }
                } catch (error) {
                    // Silent error handling
                }
            }
        });

        const activeTab = document.querySelector('.filter-btn.active');
        const currentFilter = activeTab ? activeTab.getAttribute('data-filter') : null;

        if (typeof TradeLoading.loadOutboundTrades === 'function' && document.getElementById('outbound-container')) {
            TradeLoading.loadOutboundTrades();
        }
        if (typeof TradeLoading.loadExpiredTrades === 'function' && document.getElementById('expired-container')) {
            TradeLoading.loadExpiredTrades();
        }
        if (typeof TradeLoading.loadCompletedTrades === 'function' && document.getElementById('completed-container')) {
            TradeLoading.loadCompletedTrades();
        }
        if (typeof TradeLoading.loadCounteredTrades === 'function' && document.getElementById('countered-container')) {
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