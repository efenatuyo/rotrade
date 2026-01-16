(function() {
    'use strict';

    function getOldestPendingTradeTime(pendingTrades) {
        if (pendingTrades.length === 0) return 0;
        
        const oldestTrade = pendingTrades.reduce((oldest, trade) => {
            const tradeTime = new Date(trade.created || trade.timestamp || 0).getTime();
            const oldestTime = new Date(oldest.created || oldest.timestamp || 0).getTime();
            return tradeTime < oldestTime ? trade : oldest;
        }, pendingTrades[0]);
        
        return new Date(oldestTrade.created || oldestTrade.timestamp || 0).getTime();
    }

    async function fetchOutboundTradesPage(cursor, limit) {
        let url = `https://trades.roblox.com/v1/trades/outbound?limit=${limit}&sortOrder=Desc`;
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }

        const result = await Utils.safeFetch(url, {
            method: 'GET',
            timeout: 10000,
            retries: 2
        });

        if (result.ok && result.data) {
            const responseData = result.data;
            return {
                data: Utils.ensureArray(responseData.data, []),
                nextPageCursor: responseData.nextPageCursor || null,
                previousPageCursor: responseData.previousPageCursor || null
            };
        }

        return { data: [], nextPageCursor: null, previousPageCursor: null };
    }

    async function findPendingTradesInPaginatedList(pendingTradeIds, oldestPendingTime = 0) {
        const foundTradeIds = new Set();
        let cursor = null;
        let pagesChecked = 0;
        const MAX_PAGES = 50;

        while (pagesChecked < MAX_PAGES) {
            const pageData = await fetchOutboundTradesPage(cursor, 100);
            
            if (!pageData?.data?.length) break;

            let foundOlderTrade = false;

            for (const tradeData of pageData.data) {
                if (!tradeData || tradeData.id === undefined || tradeData.id === null) {
                    continue;
                }
                
                if (oldestPendingTime > 0 && tradeData.created) {
                    const tradeCreatedTime = new Date(tradeData.created).getTime();
                    if (tradeCreatedTime < oldestPendingTime) {
                        foundOlderTrade = true;
                        continue;
                    }
                }
                
                const tradeIdFromApi = String(tradeData.id).trim();
                
                for (const pendingId of pendingTradeIds) {
                    const pendingIdStr = String(pendingId).trim();
                    if (pendingIdStr === tradeIdFromApi) {
                        foundTradeIds.add(tradeIdFromApi);
                        foundTradeIds.add(pendingIdStr);
                    }
                }
            }

            if (foundOlderTrade || !pageData.nextPageCursor) break;

            cursor = pageData.nextPageCursor;
            pagesChecked++;
        }

        return foundTradeIds;
    }

    async function fetchStatusForChangedTrades(tradeIds, foundInPaginatedList = new Set()) {
        const statusMap = new Map();

        for (const tradeId of tradeIds) {
            const tradeIdStr = String(tradeId).trim();
            
            if (foundInPaginatedList.has(tradeIdStr)) {
                continue;
            }
            
            let isInPaginatedList = false;
            for (const foundId of foundInPaginatedList) {
                const foundIdStr = String(foundId).trim();
                if (foundIdStr === tradeIdStr) {
                    isInPaginatedList = true;
                    break;
                }
            }
            
            if (isInPaginatedList) {
                continue;
            }
            
            try {
                const result = await Utils.safeFetch(`https://trades.roblox.com/v1/trades/${tradeIdStr}`, {
                    method: 'GET',
                    timeout: 8000,
                    retries: 1
                });

                if (result.ok && result.data) {
                    const tradeData = result.data.data || result.data;
                    let status = tradeData.status;
                    const isActive = tradeData.isActive;
                    
                    if (typeof status === 'string' && status && status.trim()) {
                        const normalizedStatus = status.trim().toLowerCase();
                        if (normalizedStatus === 'open' && isActive === false) {
                            statusMap.set(tradeIdStr, 'declined');
                        } else if (normalizedStatus === 'completed' || normalizedStatus === 'declined' || normalizedStatus === 'countered' || normalizedStatus === 'open') {
                            statusMap.set(tradeIdStr, normalizedStatus);
                        }
                    } else if (isActive === false) {
                        statusMap.set(tradeIdStr, 'declined');
                    }
                } else if (result.error) {
                    if (result.error.message && result.error.message.includes('429')) {
                        await Utils.delay(2000);
                        break;
                    }
                }
            } catch (error) {
            }
            
            await Utils.delay(1000);
        }

        return statusMap;
    }

    window.TradeStatusFetcher = {
        getOldestPendingTradeTime,
        fetchOutboundTradesPage,
        findPendingTradesInPaginatedList,
        fetchStatusForChangedTrades
    };

    window.getOldestPendingTradeTime = getOldestPendingTradeTime;

})();