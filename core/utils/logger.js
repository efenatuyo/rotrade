(function () {
    'use strict';
    const Logger = {
        log(event, _context = {}) {
            if (typeof event !== 'string') return;
        },
    };
    const global =
        typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis;
    if (global) {
        global.UtilsLogger = {
            Logger: Logger,
        };
    }
})();
