(function() {
    'use strict';

    async function checkRobloxTradeStatuses() {
        const pendingTrades = Storage.get('pendingExtensionTrades', []);

        if (pendingTrades.length === 0) {
            return 0;
        }

        const pendingTradeIds = new Set(pendingTrades.map(t => String(t.id).trim()));
        const fetcher = window.TradeStatusFetcher || {};
        const oldestPendingTime = fetcher.getOldestPendingTradeTime ? fetcher.getOldestPendingTradeTime(pendingTrades) : 0;

        const foundInPaginatedList = fetcher.findPendingTradesInPaginatedList 
            ? await fetcher.findPendingTradesInPaginatedList(pendingTradeIds, oldestPendingTime)
            : new Set();

        const normalizeTradeId = fetcher.normalizeTradeId || ((id) => {
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
        const tradeIdsMatch = fetcher.tradeIdsMatch || ((id1, id2) => {
            const norm1 = normalizeTradeId(id1);
            const norm2 = normalizeTradeId(id2);
            if (!norm1 || !norm2) return false;
            return norm1.str === norm2.str || norm1.num === norm2.num;
        });

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
            
            if (foundInList) {
                continue;
            }
            
            tradesToCheckIndividually.push({
                id: tradeNorm.str,
                created: trade.created || trade.createdAt || Date.now()
            });
        }
        
        tradesToCheckIndividually.sort((a, b) => (a.created || 0) - (b.created || 0));
        
        if (tradesToCheckIndividually.length > 0) {
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
            
            if (tradesToActuallyCheck.length > 0) {
                const individualStatusMap = fetcher.fetchStatusForChangedTrades
                    ? await fetcher.fetchStatusForChangedTrades(tradesToActuallyCheck, foundInPaginatedList)
                    : new Map();
                for (const tradeIdStr of tradesToActuallyCheck) {
                    const status = individualStatusMap.get(tradeIdStr);
                    if (status && status.trim()) {
                        const normalizedStatus = status.trim().toLowerCase();
                        const tradeNorm = normalizeTradeId(tradeIdStr);
                        if (!tradeNorm) continue;
                        
                        let isInList = foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num);
                        
                        if (!isInList) {
                            for (const foundId of foundInPaginatedList) {
                                if (tradeIdsMatch(tradeIdStr, foundId)) {
                                    isInList = true;
                                    break;
                                }
                            }
                        }
                        
                        if (!isInList) {
                            tradeStatusMap.set(tradeNorm.str, normalizedStatus);
                            tradeStatusMap.set(tradeNorm.num, normalizedStatus);
                        }
                    }
                }
            }
        }

        const processStatusUpdates = window.TradeStatusTrades && window.TradeStatusTrades.processStatusUpdates;
        if (!processStatusUpdates) {
            return 0;
        }

        const { stillPending, finalizedTrades, movedTrades } = processStatusUpdates(pendingTrades, tradeStatusMap);

        Storage.set('pendingExtensionTrades', stillPending);
        Storage.set('finalizedExtensionTrades', finalizedTrades);
        
        const notifyAndRefreshUI = window.TradeStatusTrades && window.TradeStatusTrades.notifyAndRefreshUI;
        if (movedTrades.length > 0 || stillPending.length !== pendingTrades.length) {
            if (notifyAndRefreshUI) {
                notifyAndRefreshUI(movedTrades);
            }
        }

        return movedTrades.length;
    }

    window.TradeStatusRoblox = {
        checkRobloxTradeStatuses
    };

    window.checkRobloxTradeStatuses = checkRobloxTradeStatuses;

})();