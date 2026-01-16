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

        const tradeStatusMap = new Map();
        
        for (const tradeId of pendingTradeIds) {
            const tradeIdStr = String(tradeId).trim();
            
            let isInList = foundInPaginatedList.has(tradeIdStr);
            if (!isInList) {
                for (const foundId of foundInPaginatedList) {
                    if (String(foundId).trim() === tradeIdStr) {
                        isInList = true;
                        break;
                    }
                }
            }
            
            if (isInList) {
                tradeStatusMap.set(tradeIdStr, 'open');
            }
        }

        const tradesToCheckIndividually = [];
        for (const trade of pendingTrades) {
            const tradeIdStr = String(trade.id).trim();
            
            let foundInList = false;
            for (const foundId of foundInPaginatedList) {
                if (String(foundId).trim() === tradeIdStr) {
                    foundInList = true;
                    break;
                }
            }
            
            if (foundInList || foundInPaginatedList.has(tradeIdStr) || tradeStatusMap.has(tradeIdStr)) {
                continue;
            }
            
            tradesToCheckIndividually.push({
                id: tradeIdStr,
                created: trade.created || trade.createdAt || Date.now()
            });
        }
        
        tradesToCheckIndividually.sort((a, b) => (a.created || 0) - (b.created || 0));
        
        if (tradesToCheckIndividually.length > 0) {
            const tradesToActuallyCheck = [];
            for (const tradeInfo of tradesToCheckIndividually) {
                const tradeIdStr = tradeInfo.id;
                
                let isInList = false;
                for (const foundId of foundInPaginatedList) {
                    if (String(foundId).trim() === tradeIdStr) {
                        isInList = true;
                        break;
                    }
                }
                
                if (!isInList && !foundInPaginatedList.has(tradeIdStr)) {
                    tradesToActuallyCheck.push(tradeIdStr);
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
                        let isInList = false;
                        for (const foundId of foundInPaginatedList) {
                            if (String(foundId).trim() === tradeIdStr) {
                                isInList = true;
                                break;
                            }
                        }
                        if (!isInList && !foundInPaginatedList.has(tradeIdStr)) {
                            tradeStatusMap.set(tradeIdStr, normalizedStatus);
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