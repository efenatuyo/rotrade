(function() {
    'use strict';

    const cache = new Map();
    const writeQueue = new Map();
    let writeTimer = null;
    const WRITE_DELAY = 100;

    function get(key, defaultValue = null) {
        if (cache.has(key)) {
            return cache.get(key);
        }
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            const parsed = JSON.parse(value);
            cache.set(key, parsed);
            return parsed;
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

    function flushWrites() {
        if (writeQueue.size === 0) {
            writeTimer = null;
            return;
        }

        const entries = Array.from(writeQueue.entries());
        writeQueue.clear();

        for (let i = 0; i < entries.length; i++) {
            const [key, value] = entries[i];
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    try {
                        const keys = Object.keys(localStorage);
                        if (keys.length > 0) {
                            localStorage.removeItem(keys[0]);
                            localStorage.setItem(key, JSON.stringify(value));
                        }
                    } catch {}
                }
            }
        }
        writeTimer = null;
    }

    function remove(key) {
        cache.delete(key);
        try {
            localStorage.removeItem(key);
        } catch {}
    }

    function clear() {
        cache.clear();
        try {
            localStorage.clear();
        } catch {}
    }

    function clearCache(key) {
        if (key) {
            cache.delete(key);
        } else {
            cache.clear();
        }
    }

    window.Storage = { get, set, setBatch, remove, clear, flush: flushWrites, clearCache };
})();
