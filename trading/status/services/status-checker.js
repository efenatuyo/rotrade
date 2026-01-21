(function() {
    'use strict';

    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;
    const TradeNotificationQueue = window.ModuleRegistry?.getSafe('TradeNotificationQueue') || window.TradeNotificationQueue;
    const TradeIdNormalizer = window.TradeIdNormalizer || {};

    function normalizeTradeId(id) {
        return TradeIdNormalizer.normalizeTradeId || ((id) => {
            if (id === null || id === undefined) return null;
            const str = String(id).trim();
            if (!str || str === 'null' || str === 'undefined') return null;
            try {
                const num = BigInt(str);
                return { str, num: num.toString() };
            } catch {
                return { str, num: str };
            }
        })(id);
    }

    function tradeIdsMatch(id1, id2) {
        return TradeIdNormalizer.tradeIdsMatch || ((id1, id2) => {
            const norm1 = normalizeTradeId(id1);
            const norm2 = normalizeTradeId(id2);
            if (!norm1 || !norm2) return false;
            return norm1.str === norm2.str || norm1.num === norm2.num;
        })(id1, id2);
    }

    async function checkTradeStatuses(pendingTrades, fetcher) {
        if (!pendingTrades || pendingTrades.length === 0) {
            return { tradeStatusMap: new Map(), tradesToCheck: [] };
        }

        const pendingTradeIds = new Set(pendingTrades.map(t => String(t.id).trim()));
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
            const tradeNorm = normalizeTradeId(trade.id);
            if (!tradeNorm) continue;
            
            let foundInList = foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num) ||
                              tradeStatusMap.has(tradeNorm.str) || tradeStatusMap.has(tradeNorm.num);
            
            if (!foundInList) {
                for (const foundId of foundInPaginatedList) {
                    if (tradeIdsMatch(trade.id, foundId)) {
                        foundInList = true;
                        break;
                    }
                }
            }
            
            if (!foundInList) {
                for (const [statusId, status] of tradeStatusMap.entries()) {
                    if (tradeIdsMatch(trade.id, statusId)) {
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
            const tradeNorm = normalizeTradeId(trade.id);
            if (tradeNorm) {
                pendingTradesMap.set(tradeNorm.str, trade);
                pendingTradesMap.set(tradeNorm.num, trade);
            }
        }

        const tradesToActuallyCheck = [];
        for (const tradeInfo of tradesToCheckIndividually) {
            const tradeNorm = normalizeTradeId(tradeInfo.id);
            if (!tradeNorm) continue;
            
            let isInList = foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num);
            
            if (!isInList) {
                for (const foundId of foundInPaginatedList) {
                    if (tradeIdsMatch(tradeInfo.id, foundId)) {
                        isInList = true;
                        break;
                    }
                }
            }
            
            if (!isInList) {
                tradesToActuallyCheck.push(tradeNorm.str);
            }
        }

        return { tradeStatusMap, tradesToCheck: tradesToActuallyCheck, foundInPaginatedList, pendingTradesMap };
    }

    function createStatusFoundCallback(tradeStatusMap, pendingTradesMap) {
        return (trade, status) => {
            const tradeNorm = normalizeTradeId(trade.id);
            if (tradeNorm) {
                tradeStatusMap.set(tradeNorm.str, status);
                tradeStatusMap.set(tradeNorm.num, status);
            }
            
            if (TradeNotificationQueue && TradeNotificationQueue.queueNotification) {
                TradeNotificationQueue.queueNotification(trade, status);
            }
            
            let pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
            pendingTrades = pendingTrades.filter(t => {
                const tNorm = normalizeTradeId(t.id);
                if (!tNorm) return true;
                return !tradeIdsMatch(t.id, trade.id);
            });
            Storage.setAccount('pendingExtensionTrades', pendingTrades);
            
            const finalizedTrades = Storage.getAccount('finalizedExtensionTrades', []);
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
            finalizedTrades.push(finalizedTrade);
            Storage.setAccount('finalizedExtensionTrades', finalizedTrades);
        };
    }

    window.TradeStatusChecker = {
        checkTradeStatuses,
        createStatusFoundCallback
    };
})();
