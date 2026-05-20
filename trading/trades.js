(function () {
    'use strict';
    const SETTINGS_DEFAULTS = {
        maxOwnerDays: 1e8,
        lastOnlineDays: 3,
        tradeMemoryDays: 7,
        autoConfirmerEnabled: false,
        usdPer1kRobux: 4,
        usdValuesEnabled: true,
        tradeListValueBoxEnabled: true,
    };
    let cachedSettings = {};
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['rotradeSettings'], function (r) {
                if (r && r.rotradeSettings && typeof r.rotradeSettings === 'object') {
                    cachedSettings = r.rotradeSettings;
                }
            });
            if (chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(function (changes, areaName) {
                    if (areaName !== 'local' || !changes || !changes.rotradeSettings) {
                        return;
                    }
                    const next = changes.rotradeSettings.newValue;
                    cachedSettings = next && typeof next === 'object' ? next : {};
                });
            }
        }
    } catch {}
    function getSettings() {
        return {
            ...SETTINGS_DEFAULTS,
            ...cachedSettings,
        };
    }
    function saveSettings(settings) {
        cachedSettings = settings && typeof settings === 'object' ? settings : {};
        Storage.set('rotradeSettings', settings);
    }
    async function getAutoConfirmerSettings(userId) {
        if (!userId) {
            userId = API.getCurrentUserIdSync
                ? API.getCurrentUserIdSync()
                : await API.getCurrentUserId();
        }
        if (!userId) {
            return {
                enabled: false,
                hasSecret: false,
            };
        }
        const globalSettings = getSettings();
        const hasSecret = await Authenticator.retrieveSecret(userId)
            .then(() => true)
            .catch(() => false);
        return {
            enabled: globalSettings.autoConfirmerEnabled || false,
            hasSecret: hasSecret,
        };
    }
    function setAutoConfirmerEnabled(enabled) {
        const settings = getSettings();
        settings.autoConfirmerEnabled = enabled;
        saveSettings(settings);
    }
    async function clearAutoConfirmerSecret(userId) {
        if (!userId) {
            userId = API.getCurrentUserIdSync
                ? API.getCurrentUserIdSync()
                : await API.getCurrentUserId();
        }
        if (userId) {
            await Authenticator.clearSecret(userId);
            try {
                await Storage.remove('2fa_secret_expired_streak_' + userId);
            } catch {}
        }
    }
    function getTodayTradeCount(tradeId) {
        const tradeCountsKey = `tradeCountsDaily_${getCurrentDateKey()}`;
        const dailyCounts = Storage.get(tradeCountsKey, {});
        return dailyCounts[tradeId] || 0;
    }
    function getCurrentDateKey() {
        return new Date().toISOString().split('T')[0];
    }
    function incrementTradeCount(tradeId) {
        const tradeCountsKey = `tradeCountsDaily_${getCurrentDateKey()}`;
        const dailyCounts = Storage.get(tradeCountsKey, {});
        dailyCounts[tradeId] = (dailyCounts[tradeId] || 0) + 1;
        Storage.set(tradeCountsKey, dailyCounts);
        const autoTrades = Storage.getAccount('autoTrades', []);
        const tradeIndex = autoTrades.findIndex((t) => t.id == tradeId);
        if (tradeIndex !== -1) {
            autoTrades[tradeIndex].settings.tradesExecutedToday = dailyCounts[tradeId];
            autoTrades[tradeIndex].lastExecuted = new Date().toISOString();
            Storage.setAccount('autoTrades', autoTrades);
        }
        return dailyCounts[tradeId];
    }
    function getSentTradeHistory() {
        return Storage.getAccount('sentTradeHistory', []);
    }
    function saveSentTradeHistory(history) {
        Storage.setAccount('sentTradeHistory', history);
    }
    async function generateTradeHash(yourItemIds, theirItemIds, yourRobux, theirRobux) {
        const sortedYourIds = [...yourItemIds].sort((a, b) => a - b).join(',');
        const sortedTheirIds = [...theirItemIds].sort((a, b) => a - b).join(',');
        const dataToHash = `${sortedYourIds}|${sortedTheirIds}|${yourRobux}|${theirRobux}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(dataToHash);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
    async function isTradeComboSentRecently(
        userId,
        yourItemIds,
        theirItemIds,
        yourRobux,
        theirRobux
    ) {
        const settings = getSettings();
        const history = getSentTradeHistory();
        const now = Date.now();
        const expiryMs = settings.tradeMemoryDays * 24 * 60 * 60 * 1e3;
        const validHistory = history.filter((entry) => now - entry.timestamp < expiryMs);
        if (validHistory.length !== history.length) {
            saveSentTradeHistory(validHistory);
        }
        const currentHash = await generateTradeHash(
            yourItemIds,
            theirItemIds,
            yourRobux,
            theirRobux
        );
        const exists = validHistory.some(
            (entry) => entry.userId === userId && entry.hash === currentHash
        );
        return exists;
    }
    async function logSentTradeCombo(userId, yourItemIds, theirItemIds, yourRobux, theirRobux) {
        const history = getSentTradeHistory();
        const hash = await generateTradeHash(yourItemIds, theirItemIds, yourRobux, theirRobux);
        history.push({
            userId: userId,
            hash: hash,
            timestamp: Date.now(),
        });
        saveSentTradeHistory(history);
    }
    window.Trades = {
        getSettings: getSettings,
        saveSettings: saveSettings,
        getTodayTradeCount: getTodayTradeCount,
        incrementTradeCount: incrementTradeCount,
        getSentTradeHistory: getSentTradeHistory,
        saveSentTradeHistory: saveSentTradeHistory,
        generateTradeHash: generateTradeHash,
        isTradeComboSentRecently: isTradeComboSentRecently,
        logSentTradeCombo: logSentTradeCombo,
        getAutoConfirmerSettings: getAutoConfirmerSettings,
        setAutoConfirmerEnabled: setAutoConfirmerEnabled,
        clearAutoConfirmerSecret: clearAutoConfirmerSecret,
    };
})();
