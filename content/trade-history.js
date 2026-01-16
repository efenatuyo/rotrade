(function() {
    'use strict';

    function getSentTradeHistory() {
        return Storage.get('sentTradeHistory', []);
    }

    function saveSentTradeHistory(history) {
        Storage.set('sentTradeHistory', history);
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
        const settings = Trades.getSettings();
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

    window.TradeHistory = {
        getSentTradeHistory,
        saveSentTradeHistory,
        generateTradeHash,
        isTradeComboSentRecently,
        logSentTradeCombo
    };

})();