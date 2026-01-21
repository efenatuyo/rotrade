(function() {
    'use strict';

    function getSettings() {
        const defaults = {
            maxOwnerDays: 100000000,
            lastOnlineDays: 3,
            tradeMemoryDays: 7
        };
        return { ...defaults, ...Storage.get('rotradeSettings', {}) };
    }

    function saveSettings(settings) {
        Storage.set('rotradeSettings', settings);
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
        const tradeIndex = autoTrades.findIndex(t => t.id == tradeId);
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
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async function isTradeComboSentRecently(userId, yourItemIds, theirItemIds, yourRobux, theirRobux) {
        const settings = getSettings();
        const history = getSentTradeHistory();
        const now = Date.now();
        const expiryMs = settings.tradeMemoryDays * 24 * 60 * 60 * 1000;

        const validHistory = history.filter(entry => (now - entry.timestamp) < expiryMs);
        if (validHistory.length !== history.length) {
            saveSentTradeHistory(validHistory);
        }

        const currentHash = await generateTradeHash(yourItemIds, theirItemIds, yourRobux, theirRobux);
        const exists = validHistory.some(entry => {
            return entry.userId === userId && entry.hash === currentHash;
        });

        return exists;
    }

    async function logSentTradeCombo(userId, yourItemIds, theirItemIds, yourRobux, theirRobux) {
        const history = getSentTradeHistory();
        const hash = await generateTradeHash(yourItemIds, theirItemIds, yourRobux, theirRobux);
        history.push({
            userId: userId,
            hash: hash,
            timestamp: Date.now()
        });
        saveSentTradeHistory(history);
    }

    window.Trades = {
        getSettings,
        saveSettings,
        getTodayTradeCount,
        incrementTradeCount,
        getSentTradeHistory,
        saveSentTradeHistory,
        generateTradeHash,
        isTradeComboSentRecently,
        logSentTradeCombo
    };
})();
