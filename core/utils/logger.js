(function() {
    'use strict';

    const Logger = {
        log(event, context = {}) {
            if (typeof event !== 'string') return;
            const timestamp = new Date().toISOString();
            const logEntry = { timestamp, event, ...context };
            
            if (event.includes('error') || event.includes('fail')) {
                console.error(`[RoTrade] ${event}`, logEntry);
            } else if (event.includes('warn')) {
                console.warn(`[RoTrade] ${event}`, logEntry);
            } else {
                console.log(`[RoTrade] ${event}`, logEntry);
            }
        }
    };

    const global = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
    
    if (global) {
        global.UtilsLogger = {
            Logger
        };
    }

})();