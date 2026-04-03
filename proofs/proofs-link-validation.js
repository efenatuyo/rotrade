(function () {
    'use strict';
    function isValidItemId(itemId) {
        if (!itemId) return false;
        const idStr = String(itemId).trim();
        if (!/^\d+$/.test(idStr)) return false;
        const idNum = parseInt(idStr, 10);
        return !isNaN(idNum) && idNum > 0 && idNum <= Number.MAX_SAFE_INTEGER;
    }
    function sanitizeItemId(itemId) {
        if (!isValidItemId(itemId)) return null;
        return String(parseInt(String(itemId).trim(), 10));
    }
    function proofsSlugFromItemName(name) {
        if (!name || typeof name !== 'string') return null;
        const raw = name.trim().replace(/\s+/g, ' ');
        return raw || null;
    }
    window.ProofsLinkValidation = {
        isValidItemId: isValidItemId,
        sanitizeItemId: sanitizeItemId,
        proofsSlugFromItemName: proofsSlugFromItemName,
    };
})();
