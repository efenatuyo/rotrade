(function() {
    'use strict';

    const global = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
    
    const Utils = {
        get debounce() { return global?.UtilsTiming?.debounce; },
        get throttle() { return global?.UtilsTiming?.throttle; },
        get nextFrame() { return global?.UtilsTiming?.nextFrame; },
        get delay() { return global?.UtilsTiming?.delay; },
        get Logger() { return global?.UtilsLogger?.Logger; },
        get withRetry() { return global?.UtilsRetry?.withRetry; },
        get withTimeout() { return global?.UtilsRetry?.withTimeout; },
        get safeFetch() { return global?.UtilsNetwork?.safeFetch; },
        get validateData() { return global?.UtilsValidation?.validateData; },
        get ensureArray() { return global?.UtilsValidation?.ensureArray; },
        get ensureNumber() { return global?.UtilsValidation?.ensureNumber; },
        get ensureString() { return global?.UtilsValidation?.ensureString; },
        get Cache() { return global?.UtilsCache?.Cache; }
    };

    if (global) {
        global.Utils = Utils;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Utils;
    }

    if (typeof exports !== 'undefined') {
        Object.assign(exports, Utils);
    }
})();