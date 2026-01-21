(function() {
    'use strict';

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

    window.TradeIdNormalizer = {
        normalizeTradeId,
        tradeIdsMatch
    };
})();
