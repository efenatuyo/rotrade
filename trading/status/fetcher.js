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

    function normalizeTradeId(id) {
        if (id === null || id === undefined) return null;
        const str = String(id).trim();
        if (!str || str === 'null' || str === 'undefined') return null;
        try {
            const num = BigInt(str);
            return { str, num: num.toString() };
        } catch {
            return { str, num: str };
        }
    }

    function tradeIdsMatch(id1, id2) {
        const norm1 = normalizeTradeId(id1);
        const norm2 = normalizeTradeId(id2);
        if (!norm1 || !norm2) return false;
        return norm1.str === norm2.str || norm1.num === norm2.num;
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
                
                const apiTradeNorm = normalizeTradeId(tradeData.id);
                if (!apiTradeNorm) continue;
                
                for (const pendingId of pendingTradeIds) {
                    if (tradeIdsMatch(pendingId, tradeData.id)) {
                        foundTradeIds.add(apiTradeNorm.str);
                        foundTradeIds.add(apiTradeNorm.num);
                        const pendingNorm = normalizeTradeId(pendingId);
                        if (pendingNorm) {
                            foundTradeIds.add(pendingNorm.str);
                            foundTradeIds.add(pendingNorm.num);
                        }
                    }
                }
            }

            if (foundOlderTrade || !pageData.nextPageCursor) break;

            cursor = pageData.nextPageCursor;
            pagesChecked++;
        }

        return foundTradeIds;
    }

    async function fetchStatusForChangedTrades(tradeIds, foundInPaginatedList = new Set(), pendingTradesMap = new Map(), onStatusFound = null) {
        const statusMap = new Map();

        for (const tradeId of tradeIds) {
            const tradeNorm = normalizeTradeId(tradeId);
            if (!tradeNorm) continue;
            
            let isInPaginatedList = foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num);
            
            if (!isInPaginatedList) {
                for (const foundId of foundInPaginatedList) {
                    if (tradeIdsMatch(tradeId, foundId)) {
                        isInPaginatedList = true;
                        break;
                    }
                }
            }
            
            if (isInPaginatedList) {
                continue;
            }
            
            try {
                const result = await Utils.safeFetch(`https://trades.roblox.com/v1/trades/${tradeNorm.str}`, {
                    method: 'GET',
                    timeout: 8000,
                    retries: 1
                });

                if (result.ok && result.data) {
                    const tradeData = result.data.data || result.data;
                    let status = tradeData.status;
                    const isActive = tradeData.isActive;
                    
                    let normalizedStatus = null;
                    if (typeof status === 'string' && status && status.trim()) {
                        normalizedStatus = status.trim().toLowerCase();
                        if (normalizedStatus === 'open' && isActive === false) {
                            normalizedStatus = 'declined';
                        } else if (!['completed', 'declined', 'countered', 'open'].includes(normalizedStatus)) {
                            normalizedStatus = null;
                        }
                    } else if (isActive === false) {
                        normalizedStatus = 'declined';
                    }
                    
                    if (normalizedStatus && normalizedStatus !== 'open') {
                        statusMap.set(tradeNorm.str, normalizedStatus);
                        statusMap.set(tradeNorm.num, normalizedStatus);
                        
                        if (onStatusFound && pendingTradesMap.has(tradeNorm.str)) {
                            const trade = pendingTradesMap.get(tradeNorm.str);
                            onStatusFound(trade, normalizedStatus);
                        }
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
        fetchStatusForChangedTrades,
        normalizeTradeId,
        tradeIdsMatch
    };

    window.getOldestPendingTradeTime = getOldestPendingTradeTime;

})();