(function() {
    'use strict';

    const global = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
    
    async function safeFetch(url, options = {}) {
        const { timeout = 10000, retries = 2, signal, ...fetchOptions } = options;
        const withRetry = global?.UtilsRetry?.withRetry;
        const withTimeout = global?.UtilsRetry?.withTimeout;
        
        if (!withRetry || !withTimeout) {
            console.error('UtilsRetry not loaded');
            return { ok: false, error: new Error('UtilsRetry not available') };
        }

        const fetchWithRetry = () => withRetry(
            async () => {
                const controller = new AbortController();
                const fetchSignal = signal || controller.signal;
                
                if (signal) {
                    signal.addEventListener('abort', () => controller.abort());
                }

                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: fetchSignal,
                    credentials: fetchOptions.credentials || 'include',
                    headers: {
                        'Accept': 'application/json',
                        ...fetchOptions.headers
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
                }

                return await response.json();
            },
            {
                retries,
                backoff: 500,
                retryable: (error) => {
                    if (error.name === 'AbortError') return false;
                    const message = error.message || '';
                    if (message.includes('429')) return false;
                    return message.includes('timeout') || message.includes('network');
                },
                signal
            }
        );

        return withTimeout(fetchWithRetry(), timeout, { signal });
    }

    if (global) {
        global.UtilsNetwork = {
            safeFetch
        };
    }

})();