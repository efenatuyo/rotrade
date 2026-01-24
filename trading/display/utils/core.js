(function() {
    'use strict';

    const { SecurityUtils, Storage, Utils } = window;
    const numCache = new Map();
    const dateCache = new Map();
    const statusCache = new Map();
    const valueCache = new WeakMap();

    const formatNum = (n) => {
        const key = `${n}`;
        if (!numCache.has(key)) {
            numCache.set(key, Number(n || 0).toLocaleString());
        }
        return numCache.get(key);
    };

    const formatRobux = (r) => {
        const amt = Number(r) || 0;
        if (amt >= 1000) return (amt / 1000).toFixed(1) + 'K';
        return formatNum(amt);
    };

    const formatDate = (ts) => {
        if (!ts) return '';
        const key = `${ts}`;
        if (!dateCache.has(key)) {
            dateCache.set(key, new Date(ts).toLocaleString());
        }
        return dateCache.get(key);
    };

    const formatProfit = (v) => {
        const n = Number(v) || 0;
        return (n >= 0 ? '+' : '') + formatNum(n);
    };

    const getTimestamp = (t) => new Date(t.timestamp || t.created || 0).getTime();

    const sortTrades = (trades, order = 'newest') => {
        const sorted = [...trades];
        sorted.sort((a, b) => {
            const diff = getTimestamp(a) - getTimestamp(b);
            return order === 'oldest' ? diff : -diff;
        });
        return sorted;
    };

    const sumProp = (items, prop) => items.reduce((s, i) => s + (i[prop] || 0), 0);

    const calcValues = (trade) => {
        if (valueCache.has(trade)) return valueCache.get(trade);
        const giving = Array.isArray(trade.giving) ? trade.giving : [];
        const receiving = Array.isArray(trade.receiving) ? trade.receiving : [];
        const rg = Number(trade.robuxGive) || 0;
        const rr = Number(trade.robuxGet) || 0;
        const result = {
            giving, receiving, robuxGive: rg, robuxGet: rr,
            yourRap: sumProp(giving, 'rap') + rg,
            yourVal: sumProp(giving, 'value') + rg,
            theirRap: sumProp(receiving, 'rap') + rr,
            theirVal: sumProp(receiving, 'value') + rr
        };
        result.rapProfit = result.theirRap - result.yourRap;
        result.valProfit = result.theirVal - result.yourVal;
        valueCache.set(trade, result);
        return result;
    };

    const hasItems = (trade) => {
        const v = calcValues(trade);
        return v.giving.length > 0 || v.receiving.length > 0 || v.robuxGive > 0 || v.robuxGet > 0;
    };

    const getStatusConfig = (status, containerId) => {
        const key = `${status}:${containerId}`;
        if (statusCache.has(key)) return statusCache.get(key);
        const isHist = containerId.includes('completed') || containerId.includes('expired') || containerId.includes('countered');
        const map = {
            declined: { color: '#dc3545', bg: 'rgba(220, 53, 69, 0.2)', text: 'DECLINED' },
            accepted: { color: '#28a745', bg: 'rgba(40, 167, 69, 0.2)', text: 'ACCEPTED' },
            completed: { color: '#28a745', bg: 'rgba(40, 167, 69, 0.2)', text: 'COMPLETED' },
            countered: { color: '#ff6b35', bg: 'rgba(255, 107, 53, 0.2)', text: 'COUNTERED' }
        };
        const result = isHist ? (map[status] || { color: '#6c757d', bg: 'rgba(108, 117, 125, 0.2)', text: (status || 'UNKNOWN').toUpperCase() }) : { color: '#ffc107', bg: 'rgba(255, 193, 7, 0.2)', text: 'OUTBOUND' };
        statusCache.set(key, result);
        return result;
    };

    const getPagKeys = (id) => ({ currentPage: `${id}CurrentPage`, sortOrder: `${id}SortOrder` });

    if (!window._paginationMemory) {
        window._paginationMemory = {};
    }

    const getPage = (id, def = 1) => {
        const keys = getPagKeys(id);
        const pageStr = window._paginationMemory[keys.currentPage] || String(def);
        const parsed = parseInt(pageStr);
        return isNaN(parsed) ? def : parsed;
    };

    const setPage = (id, p) => {
        const keys = getPagKeys(id);
        window._paginationMemory[keys.currentPage] = String(p);
    };

    const getSort = (id, def = 'newest') => {
        const keys = getPagKeys(id);
        return Storage.get(keys.sortOrder, def);
    };

    const setSort = (id, o) => {
        const keys = getPagKeys(id);
        Storage.set(keys.sortOrder, o);
    };

    const calcPag = (total, perPage, curr) => {
        const totalItems = isNaN(total) ? 0 : Math.max(0, total);
        const itemsPerPage = isNaN(perPage) ? 12 : Math.max(1, perPage);
        const currentPage = isNaN(curr) || curr < 1 ? 1 : curr;
        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
        const normPage = Math.min(Math.max(1, currentPage), totalPages);
        const start = (normPage - 1) * itemsPerPage;
        return { totalPages, currentPage: normPage, startIndex: start, endIndex: start + itemsPerPage };
    };

    const getPagItems = (items, perPage, curr) => {
        const { startIndex, endIndex } = calcPag(items.length, perPage, curr);
        return items.slice(startIndex, endIndex);
    };

    const getEmptyMsg = (id) => {
        if (id.includes('completed')) return 'No completed trades yet.';
        if (id.includes('outbound')) return 'No outbound trades at the moment.';
        if (id.includes('expired')) return 'No declined trades found.';
        if (id.includes('countered')) return 'No countered trades found.';
        return 'No trades found.';
    };

    window.TradeDisplayCore = {
        formatNum, formatRobux, formatDate, formatProfit,
        getTimestamp, sortTrades, sumProp, calcValues, hasItems,
        getStatusConfig, getPagKeys, getPage, setPage, getSort, setSort,
        calcPag, getPagItems, getEmptyMsg
    };

})();
