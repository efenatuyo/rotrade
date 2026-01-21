(function() {
    'use strict';

    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;
    const TradeStatusChecker = window.TradeStatusChecker || {};
    const TradeStatusTrades = window.TradeStatusTrades || {};

    async function checkRobloxTradeStatuses() {
        try {
            const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);

            if (pendingTrades.length === 0) {
                return 0;
            }

            const fetcher = window.TradeStatusFetcher || {};
            
            const { tradeStatusMap, tradesToCheck, foundInPaginatedList, pendingTradesMap } = 
                await TradeStatusChecker.checkTradeStatuses?.(pendingTrades, fetcher) || {
                    tradeStatusMap: new Map(),
                    tradesToCheck: [],
                    foundInPaginatedList: new Set(),
                    pendingTradesMap: new Map()
                };

            if (tradesToCheck.length > 0 && fetcher.fetchStatusForChangedTrades) {
                const onStatusFound = TradeStatusChecker.createStatusFoundCallback?.(tradeStatusMap, pendingTradesMap) || (() => {});
                
                const individualStatusMap = await fetcher.fetchStatusForChangedTrades(
                    tradesToCheck, 
                    foundInPaginatedList, 
                    pendingTradesMap, 
                    onStatusFound
                );
                
                const normalizeTradeId = window.TradeIdNormalizer?.normalizeTradeId || ((id) => {
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

                for (const tradeIdStr of tradesToCheck) {
                    const status = individualStatusMap.get(tradeIdStr);
                    if (status && status.trim()) {
                        const normalizedStatus = status.trim().toLowerCase();
                        const tradeNorm = normalizeTradeId(tradeIdStr);
                        if (!tradeNorm) continue;
                        
                        let isInList = foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num);
                        
                        if (!isInList) {
                            for (const foundId of foundInPaginatedList) {
                                const tradeIdsMatch = window.TradeIdNormalizer?.tradeIdsMatch || (() => false);
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

            const processStatusUpdates = TradeStatusTrades.processStatusUpdates;
            if (!processStatusUpdates) {
                return 0;
            }

            const { stillPending, finalizedTrades, movedTrades } = processStatusUpdates(pendingTrades, tradeStatusMap);

            Storage.setAccount('pendingExtensionTrades', stillPending);
            Storage.setAccount('finalizedExtensionTrades', finalizedTrades);
            
            const notifyAndRefreshUI = TradeStatusTrades.notifyAndRefreshUI;
            if (movedTrades.length > 0 || stillPending.length !== pendingTrades.length) {
                if (notifyAndRefreshUI) {
                    notifyAndRefreshUI(movedTrades);
                }
            }

            return movedTrades.length;
        } catch (error) {
            if (window.handleUnexpectedError) {
                window.handleUnexpectedError(error, {
                    module: 'TradeStatusRoblox',
                    action: 'checkRobloxTradeStatuses',
                    severity: window.ERROR_SEVERITY?.HIGH || 'high'
                });
            }
            return 0;
        }
    }

    window.TradeStatusRoblox = {
        checkRobloxTradeStatuses
    };

    window.checkRobloxTradeStatuses = checkRobloxTradeStatuses;

})();