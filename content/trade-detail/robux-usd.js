(function () {
    'use strict';
    let robuxUsdPer1kCache = null;
    function invalidateCache() {
        robuxUsdPer1kCache = null;
    }
    function loadSettings() {
        return new Promise(function (resolve) {
            if (robuxUsdPer1kCache !== null) {
                resolve(robuxUsdPer1kCache);
                return;
            }
            try {
                chrome.storage.local.get(['rotradeSettings'], function (r) {
                    if (chrome.runtime.lastError) {
                        robuxUsdPer1kCache = 4;
                        resolve(4);
                        return;
                    }
                    const v = r && r.rotradeSettings && r.rotradeSettings.usdPer1kRobux;
                    const n = parseFloat(v);
                    const per1k = isFinite(n) && n > 0 ? n : 4;
                    robuxUsdPer1kCache = per1k;
                    resolve(per1k);
                });
            } catch {
                robuxUsdPer1kCache = 4;
                resolve(4);
            }
        });
    }
    function robuxAmountToUsd(robux, usdPer1k) {
        const per1k =
            typeof usdPer1k === 'number' && isFinite(usdPer1k) && usdPer1k > 0 ? usdPer1k : 4;
        return robux * (per1k / 1e3);
    }
    window.TradeDetailRobuxUsd = {
        invalidateCache: invalidateCache,
        loadSettings: loadSettings,
        robuxAmountToUsd: robuxAmountToUsd,
    };
})();
