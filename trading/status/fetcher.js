(function () {
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
    function unwrapSafeFetchBody(result) {
        if (!result || !result.ok || !result.data) {
            return null;
        }
        let responseData = result.data;
        if (responseData && responseData.ok && responseData.data !== undefined) {
            responseData = responseData.data;
        }
        return responseData;
    }
    async function fetchOutboundTradesPage(cursor, limit) {
        let url = `https://trades.roblox.com/v1/trades/outbound?limit=${limit}&sortOrder=Desc`;
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }
        const result = await Utils.safeFetch(url, {
            method: 'GET',
            timeout: 1e4,
            retries: 2,
        });
        const responseData = unwrapSafeFetchBody(result);
        if (!responseData) {
            return {
                data: [],
                nextPageCursor: null,
                previousPageCursor: null,
            };
        }
        let tradesData = [];
        let nextPageCursor = null;
        let previousPageCursor = null;
        if (Array.isArray(responseData.data)) {
            tradesData = responseData.data;
            nextPageCursor = responseData.nextPageCursor ?? null;
            previousPageCursor = responseData.previousPageCursor ?? null;
        } else if (Array.isArray(responseData)) {
            tradesData = responseData;
        }
        return {
            data: tradesData,
            nextPageCursor: nextPageCursor,
            previousPageCursor: previousPageCursor,
        };
    }
    function normalizeTradeId(id) {
        if (id === null || id === undefined) return null;
        const str = String(id).trim();
        if (!str || str === 'null' || str === 'undefined') return null;
        try {
            const num = BigInt(str);
            return {
                str: str,
                num: num.toString(),
            };
        } catch {
            return {
                str: str,
                num: str,
            };
        }
    }
    function tradeIdsMatch(id1, id2) {
        const norm1 = normalizeTradeId(id1);
        const norm2 = normalizeTradeId(id2);
        if (!norm1 || !norm2) return false;
        return norm1.str === norm2.str || norm1.num === norm2.num;
    }
    async function findPendingTradesInPaginatedList(pendingTrades, oldestPendingTime = 0) {
        const foundTradeIds = new Set();
        const allOutboundTradeIds = new Set();
        const pendingTradeIds = Array.isArray(pendingTrades)
            ? pendingTrades
                  .map(function (t) {
                      return String(t && t.id != null ? t.id : '').trim();
                  })
                  .filter(function (id) {
                      return id && id !== 'undefined' && id !== 'null';
                  })
            : [];
        if (pendingTradeIds.length === 0) {
            return foundTradeIds;
        }
        if (oldestPendingTime <= 0) {
            oldestPendingTime = getOldestPendingTradeTime(
                Array.isArray(pendingTrades) ? pendingTrades : []
            );
        }
        let cursor = null;
        let pagesChecked = 0;
        const MAX_PAGES = 50;
        while (pagesChecked < MAX_PAGES) {
            const pageData = await fetchOutboundTradesPage(cursor, 100);
            if (!pageData?.data?.length) {
                break;
            }
            let foundOlderTrade = false;
            for (const tradeData of pageData.data) {
                if (!tradeData || tradeData.id === undefined || tradeData.id === null) {
                    continue;
                }
                const apiTradeNorm = normalizeTradeId(tradeData.id);
                if (!apiTradeNorm) continue;
                allOutboundTradeIds.add(apiTradeNorm.str);
                allOutboundTradeIds.add(apiTradeNorm.num);
                if (oldestPendingTime > 0 && tradeData.created) {
                    const tradeCreatedTime = new Date(tradeData.created).getTime();
                    if (tradeCreatedTime < oldestPendingTime) {
                        foundOlderTrade = true;
                    }
                }
                for (let pi = 0; pi < pendingTradeIds.length; pi++) {
                    const pendingId = pendingTradeIds[pi];
                    const pendingIdStr = String(pendingId).trim();
                    const matches = tradeIdsMatch(pendingIdStr, tradeData.id);
                    if (matches) {
                        foundTradeIds.add(apiTradeNorm.str);
                        foundTradeIds.add(apiTradeNorm.num);
                        const pendingNorm = normalizeTradeId(pendingIdStr);
                        if (pendingNorm) {
                            foundTradeIds.add(pendingNorm.str);
                            foundTradeIds.add(pendingNorm.num);
                        }
                    }
                }
            }
            if (foundOlderTrade || !pageData.nextPageCursor) {
                break;
            }
            cursor = pageData.nextPageCursor;
            pagesChecked++;
        }
        for (const pendingId of pendingTradeIds) {
            const pendingIdStr = String(pendingId).trim();
            const pendingNorm = normalizeTradeId(pendingIdStr);
            if (!pendingNorm) continue;
            const hasStr = allOutboundTradeIds.has(pendingNorm.str);
            const hasNum = allOutboundTradeIds.has(pendingNorm.num);
            if (hasStr || hasNum) {
                foundTradeIds.add(pendingNorm.str);
                foundTradeIds.add(pendingNorm.num);
            } else {
                for (const outboundId of allOutboundTradeIds) {
                    const outboundNorm = normalizeTradeId(outboundId);
                    if (
                        outboundNorm &&
                        (pendingNorm.str === outboundNorm.str ||
                            pendingNorm.num === outboundNorm.num ||
                            pendingNorm.str === outboundNorm.num ||
                            pendingNorm.num === outboundNorm.str)
                    ) {
                        foundTradeIds.add(pendingNorm.str);
                        foundTradeIds.add(pendingNorm.num);
                        break;
                    }
                    if (tradeIdsMatch(pendingIdStr, outboundId)) {
                        foundTradeIds.add(pendingNorm.str);
                        foundTradeIds.add(pendingNorm.num);
                        break;
                    }
                }
            }
        }
        return foundTradeIds;
    }
    function normalizeV2TradeStatus(rawStatus) {
        if (rawStatus == null || typeof rawStatus !== 'string' || !rawStatus.trim()) {
            return 'declined';
        }
        const s = rawStatus.trim().toLowerCase();
        if (s === 'completed') {
            return 'completed';
        }
        if (s === 'declined') {
            return 'declined';
        }
        if (s === 'countered') {
            return 'countered';
        }
        if (s === 'expired') {
            return 'expired';
        }
        if (s === 'open' || s === 'pending' || s === 'processing') {
            return 'open';
        }
        return 'declined';
    }
    async function fetchStatusForChangedTrades(
        tradeIds,
        foundInPaginatedList = new Set(),
        pendingTradesMap = new Map(),
        onStatusFound = null
    ) {
        const statusMap = new Map();
        if (!Array.isArray(tradeIds) || tradeIds.length === 0) {
            return statusMap;
        }
        for (const tradeId of tradeIds) {
            if (!tradeId || tradeId === 'undefined' || tradeId === 'null') {
                continue;
            }
            const tradeNorm = normalizeTradeId(tradeId);
            if (!tradeNorm) continue;
            let isInPaginatedList =
                foundInPaginatedList.has(tradeNorm.str) || foundInPaginatedList.has(tradeNorm.num);
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
                const result = await Utils.safeFetch(
                    `https://trades.roblox.com/v2/trades/${tradeNorm.str}`,
                    {
                        method: 'GET',
                        timeout: 8e3,
                        retries: 1,
                    }
                );
                const responseData = unwrapSafeFetchBody(result);
                if (responseData) {
                    const tradeData = responseData;
                    const normalizedStatus = normalizeV2TradeStatus(tradeData.status);
                    if (normalizedStatus && normalizedStatus !== 'open') {
                        statusMap.set(tradeNorm.str, normalizedStatus);
                        statusMap.set(tradeNorm.num, normalizedStatus);
                        if (onStatusFound && pendingTradesMap.has(tradeNorm.str)) {
                            const trade = pendingTradesMap.get(tradeNorm.str);
                            onStatusFound(trade, normalizedStatus);
                        }
                    }
                } else if (result && result.error && result.error.message) {
                    if (result.error.message.includes('429')) {
                        await Utils.delay(2e3);
                        break;
                    }
                }
            } catch (error) {}
            await Utils.delay(1e3);
        }
        return statusMap;
    }
    window.TradeStatusFetcher = {
        getOldestPendingTradeTime: getOldestPendingTradeTime,
        fetchOutboundTradesPage: fetchOutboundTradesPage,
        findPendingTradesInPaginatedList: findPendingTradesInPaginatedList,
        fetchStatusForChangedTrades: fetchStatusForChangedTrades,
        normalizeTradeId: normalizeTradeId,
        tradeIdsMatch: tradeIdsMatch,
    };
    window.getOldestPendingTradeTime = getOldestPendingTradeTime;
})();
