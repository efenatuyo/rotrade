(function () {
    'use strict';
    const Cache = {
        stores: new Map(),
        create(name, options = {}) {
            const { ttl: ttl = 3e5, maxSize: maxSize = 1e3 } = options;
            const store = {
                data: new Map(),
                ttl: ttl,
                maxSize: maxSize,
                get(key) {
                    const entry = this.data.get(key);
                    if (!entry) return null;
                    if (Date.now() - entry.timestamp > this.ttl) {
                        this.data.delete(key);
                        return null;
                    }
                    return entry.value;
                },
                set(key, value) {
                    if (this.data.size >= this.maxSize) {
                        const firstKey = this.data.keys().next().value;
                        this.data.delete(firstKey);
                    }
                    this.data.set(key, {
                        value: value,
                        timestamp: Date.now(),
                    });
                },
                invalidate(key) {
                    if (key) {
                        this.data.delete(key);
                    } else {
                        this.data.clear();
                    }
                },
                has(key) {
                    const entry = this.data.get(key);
                    if (!entry) return false;
                    if (Date.now() - entry.timestamp > this.ttl) {
                        this.data.delete(key);
                        return false;
                    }
                    return true;
                },
            };
            this.stores.set(name, store);
            return store;
        },
        get(name) {
            return this.stores.get(name);
        },
    };
    const global =
        typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis;
    if (global) {
        global.UtilsCache = {
            Cache: Cache,
        };
    }
})();
