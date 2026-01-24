(function() {
    'use strict';

    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;
    const TradeNotificationQueue = window.ModuleRegistry?.getSafe('TradeNotificationQueue') || window.TradeNotificationQueue;
    const TradeIdNormalizer = window.TradeIdNormalizer || {};

    function normalizeTradeId(id) {
        const normalizer = TradeIdNormalizer.normalizeTradeId || ((id) => {
            if (id === null || id === undefined) return null;
            const str = String(id).trim();
            if (!str || str === 'null' || str === 'undefined') return null;
            try {
                const num = BigInt(str);
                return { str, num: num.toString() };
            } catch {
                return { str, num: str };
            }
        });
        return normalizer(id);
    }

    function tradeIdsMatch(id1, id2) {
        const matcher = TradeIdNormalizer.tradeIdsMatch || ((id1, id2) => {
            const norm1 = normalizeTradeId(id1);
            const norm2 = normalizeTradeId(id2);
            if (!norm1 || !norm2) return false;
            return norm1.str === norm2.str || norm1.num === norm2.num;
        });
        return matcher(id1, id2);
    }

    async function checkTradeStatuses(pendingTrades, fetcher) {
        if (!pendingTrades || pendingTrades.length === 0) {
            return { tradeStatusMap: new Map(), tradesToCheck: [] };
        }

        const pendingTradeIds = new Set(pendingTrades.map(t => String(t.id).trim()).filter(id => id && id !== 'undefined' && id !== 'null'));
        const oldestPendingTime = fetcher?.getOldestPendingTradeTime 
            ? fetcher.getOldestPendingTradeTime(pendingTrades) 
            : 0;

        const foundInPaginatedList = fetcher?.findPendingTradesInPaginatedList 
            ? await fetcher.findPendingTradesInPaginatedList(pendingTradeIds, oldestPendingTime)
            : new Set();

        const tradeStatusMap = new Map();
        
        for (const tradeId of pendingTradeIds) {
            const tradeNorm = normalizeTradeId(tradeId);
            if (!tradeNorm) continue;
            
            let isInList = foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num);
            
            if (!isInList) {
                for (const foundId of foundInPaginatedList) {
                    const foundIdNorm = normalizeTradeId(foundId);
                    if (foundIdNorm && (tradeNorm.str === foundIdNorm.str || tradeNorm.num === foundIdNorm.num || 
                        tradeNorm.str === foundIdNorm.num || tradeNorm.num === foundIdNorm.str)) {
                        isInList = true;
                        break;
                    }
                    if (tradeIdsMatch(tradeId, foundId)) {
                        isInList = true;
                        break;
                    }
                }
            }
            
            if (isInList) {
                tradeStatusMap.set(tradeNorm.str, 'open');
                tradeStatusMap.set(tradeNorm.num, 'open');
            }
        }

        const tradesToCheckIndividually = [];
        for (const trade of pendingTrades) {
            const tradeIdStr = String(trade.id).trim();
            const tradeNorm = normalizeTradeId(tradeIdStr);
            if (!tradeNorm) {
                continue;
            }
            
            let foundInList = foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num) ||
                              tradeStatusMap.has(tradeNorm.str) || tradeStatusMap.has(tradeNorm.num);
            
            if (!foundInList) {
                for (const foundId of foundInPaginatedList) {
                    if (tradeIdsMatch(tradeIdStr, foundId)) {
                        foundInList = true;
                        break;
                    }
                }
            }
            
            if (!foundInList) {
                for (const [statusId, status] of tradeStatusMap.entries()) {
                    if (tradeIdsMatch(tradeIdStr, statusId)) {
                        foundInList = true;
                        break;
                    }
                }
            }
            
            if (foundInList) {
                continue;
            }
            
            tradesToCheckIndividually.push({
                id: tradeNorm.str,
                created: trade.created || trade.createdAt || trade.timestamp || Date.now()
            });
        }
        
        tradesToCheckIndividually.sort((a, b) => (a.created || 0) - (b.created || 0));
        
        const pendingTradesMap = new Map();
        for (const trade of pendingTrades) {
            const tradeIdStr = String(trade.id).trim();
            const tradeNorm = normalizeTradeId(tradeIdStr);
            if (tradeNorm) {
                pendingTradesMap.set(tradeNorm.str, trade);
                pendingTradesMap.set(tradeNorm.num, trade);
            }
        }

        const tradesToActuallyCheck = [];
        for (const tradeInfo of tradesToCheckIndividually) {
            if (!tradeInfo || !tradeInfo.id) {
                continue;
            }
            
            const tradeNorm = normalizeTradeId(tradeInfo.id);
            if (!tradeNorm || !tradeNorm.str) {
                continue;
            }
            
            let isInList = foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num) ||
                          tradeStatusMap.has(tradeNorm.str) || tradeStatusMap.has(tradeNorm.num);
            
            if (!isInList) {
                for (const foundId of foundInPaginatedList) {
                    if (tradeIdsMatch(tradeInfo.id, foundId)) {
                        isInList = true;
                        break;
                    }
                }
            }
            
            if (!isInList) {
                for (const [statusId, status] of tradeStatusMap.entries()) {
                    if (tradeIdsMatch(tradeInfo.id, statusId)) {
                        isInList = true;
                        break;
                    }
                }
            }
            
            if (!isInList && tradeNorm.str) {
                tradesToActuallyCheck.push(tradeNorm.str);
            }
        }

        return { tradeStatusMap, tradesToCheck: tradesToActuallyCheck, foundInPaginatedList, pendingTradesMap };
    }

    function createStatusFoundCallback(tradeStatusMap, pendingTradesMap) {
        return async (trade, status) => {
            const tradeNorm = normalizeTradeId(trade.id);
            if (tradeNorm) {
                const normalizedStatus = String(status).trim().toLowerCase();
                tradeStatusMap.set(tradeNorm.str, normalizedStatus);
                tradeStatusMap.set(tradeNorm.num, normalizedStatus);
                tradeStatusMap.set(String(trade.id).trim(), normalizedStatus);
            }
            
            // Try to queue notification, with fallbacks
            const normalizedStatus = String(status).trim().toLowerCase();
            const shouldNotify = ['completed', 'accepted', 'countered', 'declined'].includes(normalizedStatus);
            
            if (shouldNotify && normalizedStatus === 'declined' && trade.userDeclined === true) {
                // Skip user-declined trades
            } else if (shouldNotify) {
                if (TradeNotificationQueue && TradeNotificationQueue.queueNotification) {
                    TradeNotificationQueue.queueNotification(trade, status);
                } else if (window.TradeStatusNotifications && window.TradeStatusNotifications.showTradeNotification) {
                    window.TradeStatusNotifications.showTradeNotification(trade, status);
                } else if (window.showTradeNotification) {
                    window.showTradeNotification(trade, status);
                }
            }
            
            let pendingTrades = await Storage.getAccountAsync('pendingExtensionTrades', []);
            pendingTrades = pendingTrades.filter(t => {
                const tNorm = normalizeTradeId(t.id);
                if (!tNorm) return true;
                return !tradeIdsMatch(t.id, trade.id);
            });
            Storage.setAccount('pendingExtensionTrades', pendingTrades);
            
            const finalizedTrades = await Storage.getAccountAsync('finalizedExtensionTrades', []);
            const existingIndex = finalizedTrades.findIndex(t => {
                const tNorm = normalizeTradeId(t.id);
                const tradeNorm = normalizeTradeId(trade.id);
                if (!tNorm || !tradeNorm) return false;
                return tradeIdsMatch(t.id, trade.id);
            });
            
            const finalizedTrade = {
                ...trade,
                status: status,
                finalizedAt: Date.now(),
                robloxStatus: status,
                giving: Array.isArray(trade.giving) ? trade.giving : [],
                receiving: Array.isArray(trade.receiving) ? trade.receiving : [],
                robuxGive: Number(trade.robuxGive) || 0,
                robuxGet: Number(trade.robuxGet) || 0
            };
            
            if (existingIndex >= 0) {
                finalizedTrades[existingIndex] = finalizedTrade;
            } else {
                finalizedTrades.push(finalizedTrade);
            }
            Storage.setAccount('finalizedExtensionTrades', finalizedTrades);
        };
    }

    window.TradeStatusChecker = {
        checkTradeStatuses,
        createStatusFoundCallback
    };
})();
