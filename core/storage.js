(function() {
    'use strict';

    const cache = new Map();
    const writeQueue = new Map();
    let writeTimer = null;
    const WRITE_DELAY = 100;

    async function get(key, defaultValue = null) {
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        try {
            const result = await chrome.storage.local.get([key]);
            if (result[key] !== undefined) {
                cache.set(key, result[key]);
                return result[key];
            }
            return defaultValue;
        } catch {
            return defaultValue;
        }
    }

    function set(key, value) {
        cache.set(key, value);
        writeQueue.set(key, value);
        if (!writeTimer) {
            if (window.Utils && window.Utils.delay) {
                window.Utils.delay(WRITE_DELAY).then(flushWrites);
            } else {
                writeTimer = setTimeout(flushWrites, WRITE_DELAY);
            }
        }
    }

    function setBatch(updates) {
        for (const [key, value] of Object.entries(updates)) {
            cache.set(key, value);
            writeQueue.set(key, value);
        }
        if (!writeTimer) {
            if (window.Utils && window.Utils.delay) {
                window.Utils.delay(WRITE_DELAY).then(flushWrites);
            } else {
                writeTimer = setTimeout(flushWrites, WRITE_DELAY);
            }
        }
    }

    async function flushWrites() {
        if (writeQueue.size === 0) {
            writeTimer = null;
            return;
        }

        const entries = Array.from(writeQueue.entries());
        writeQueue.clear();

        try {
            const updates = {};
            for (const [key, value] of entries) {
                updates[key] = value;
            }
            await chrome.storage.local.set(updates);
        } catch (e) {
        }
        writeTimer = null;
    }

    async function remove(key) {
        cache.delete(key);
        try {
            await chrome.storage.local.remove([key]);
        } catch {}
    }

    async function clear() {
        cache.clear();
        try {
            await chrome.storage.local.clear();
        } catch {}
    }

    function clearCache(key) {
        if (key) {
            cache.delete(key);
        } else {
            cache.clear();
        }
    }

    let currentAccountId = null;
    const ACCOUNT_SPECIFIC_KEYS = ['autoTrades', 'pendingExtensionTrades', 'sentTrades', 'sentTradeHistory', 'finalizedExtensionTrades', 'notifiedTrades', 'privacyRestrictedUsers'];

    function getAccountKey(key, accountId) {
        if (!accountId) return key;
        return `${key}_${accountId}`;
    }

    async function getAccountAsync(key, defaultValue = null) {
        if (!ACCOUNT_SPECIFIC_KEYS.includes(key)) {
            return await get(key, defaultValue);
        }
        if (!currentAccountId && window.API) {
            try {
                const userId = window.API.getCurrentUserIdSync ? window.API.getCurrentUserIdSync() : (await window.API.getCurrentUserId());
                if (userId) {
                    currentAccountId = userId;
                }
            } catch {}
        }
        const accountKey = getAccountKey(key, currentAccountId);
        return await get(accountKey, defaultValue);
    }

    function getAccount(key, defaultValue = null) {
        if (!ACCOUNT_SPECIFIC_KEYS.includes(key)) {
            if (cache.has(key)) {
                return cache.get(key);
            }
            return defaultValue;
        }
        if (!currentAccountId) {
            return defaultValue;
        }
        const accountKey = getAccountKey(key, currentAccountId);
        if (cache.has(accountKey)) {
            return cache.get(accountKey);
        }
        return defaultValue;
    }

    function setAccount(key, value) {
        if (!ACCOUNT_SPECIFIC_KEYS.includes(key)) {
            set(key, value);
            return;
        }
        const accountKey = getAccountKey(key, currentAccountId);
        set(accountKey, value);
    }

    function setCurrentAccountId(accountId) {
        currentAccountId = accountId;
    }

    function clearAccountCache() {
        cache.clear();
    }

    function getCurrentAccountId() {
        return currentAccountId;
    }

    async function preloadAccountData(userId) {
        if (!userId) return;
        
        currentAccountId = userId;
        const keysToLoad = ACCOUNT_SPECIFIC_KEYS.map(key => getAccountKey(key, userId));
        
        try {
            const results = await chrome.storage.local.get(keysToLoad);
            for (const [key, value] of Object.entries(results)) {
                if (value !== undefined) {
                    cache.set(key, value);
                }
            }
        } catch (e) {
        }
    }

    window.Storage = { 
        get, 
        set, 
        setBatch, 
        remove, 
        clear, 
        flush: flushWrites, 
        clearCache,
        getAccount,
        getAccountAsync,
        setAccount,
        setCurrentAccountId,
        getCurrentAccountId,
        clearAccountCache,
        preloadAccountData
    };

    window.ExtensionStorage = window.Storage;
})();
