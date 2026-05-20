(function () {
    'use strict';

    const failureTracker = new Map();
    const MAX_FAILURES = 2;

    function getTradeKey(opportunity) {
        return `${opportunity.id}_${opportunity.targetUserId}`;
    }

    function resetFailureCount(opportunity) {
        const key = getTradeKey(opportunity);
        failureTracker.delete(key);
    }

    function incrementFailureCount(opportunity) {
        const key = getTradeKey(opportunity);
        const count = failureTracker.get(key) || 0;
        failureTracker.set(key, count + 1);
        return count + 1;
    }

    function shouldUseFallback(opportunity) {
        const key = getTradeKey(opportunity);
        const failures = failureTracker.get(key) || 0;
        return failures >= MAX_FAILURES;
    }

    window.AutoConfirmerFailureTracker = {
        getTradeKey: getTradeKey,
        resetFailureCount: resetFailureCount,
        incrementFailureCount: incrementFailureCount,
        shouldUseFallback: shouldUseFallback,
        MAX_FAILURES: MAX_FAILURES,
    };
})();
