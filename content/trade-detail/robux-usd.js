(function () {
    'use strict';
    let cache = null;
    function invalidateCache() {
        cache = null;
    }
    function loadSettings() {
        return new Promise(function (resolve) {
            if (cache !== null) {
                resolve(cache);
                return;
            }
            try {
                chrome.storage.local.get(['rotradeSettings'], function (r) {
                    if (chrome.runtime.lastError) {
                        cache = {
                            per1k: 4,
                            enabled: true,
                            showTradeSummaryWinLoss: true,
                        };
                        resolve(cache);
                        return;
                    }
                    const s = (r && r.rotradeSettings) || {};
                    const n = parseFloat(s.usdPer1kRobux);
                    const per1k = isFinite(n) && n > 0 ? n : 4;
                    const enabled = s.usdValuesEnabled !== false;
                    const showTradeSummaryWinLoss = s.showTradeSummaryWinLoss !== false;
                    cache = { per1k, enabled, showTradeSummaryWinLoss };
                    resolve(cache);
                });
            } catch {
                cache = { per1k: 4, enabled: true, showTradeSummaryWinLoss: true };
                resolve(cache);
            }
        });
    }
    function robuxAmountToUsd(robux, usdPer1k) {
        const per1k =
            typeof usdPer1k === 'number' && isFinite(usdPer1k) && usdPer1k > 0 ? usdPer1k : 4;
        return robux * (per1k / 1e3);
    }
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener(function (changes, areaName) {
                if (areaName === 'local' && changes && changes.rotradeSettings) {
                    invalidateCache();
                }
            });
        }
    } catch {}
    window.TradeDetailRobuxUsd = {
        invalidateCache: invalidateCache,
        loadSettings: loadSettings,
        robuxAmountToUsd: robuxAmountToUsd,
    };
})();
