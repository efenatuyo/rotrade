(function() {
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

    window.ProofsLinkValidation = {
        isValidItemId,
        sanitizeItemId
    };
})();
