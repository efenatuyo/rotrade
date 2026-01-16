(function() {
    'use strict';

    const global = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
    
    async function withRetry(fn, options = {}) {
        const { retries = 3, backoff = 500, retryable = () => true, signal } = options;
        const Logger = global?.UtilsLogger?.Logger;
        const delay = global?.UtilsTiming?.delay;
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            if (signal?.aborted) {
                return { ok: false, error: new DOMException('Aborted', 'AbortError'), aborted: true };
            }

            try {
                const result = await fn();
                if (attempt > 0 && Logger) {
                    Logger.log('retry_success', { attempt, totalAttempts: attempt + 1 });
                }
                return { ok: true, data: result, attempts: attempt + 1 };
            } catch (error) {
                lastError = error;
                
                if (attempt < retries && retryable(error)) {
                    const waitTime = backoff * Math.pow(2, attempt);
                    if (Logger) {
                        Logger.log('retry_attempt', { attempt: attempt + 1, maxRetries: retries, waitTime, error: error.message });
                    }
                    try {
                        if (delay) {
                            await delay(waitTime, { signal });
                        } else {
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                    } catch (delayError) {
                        return { ok: false, error: delayError, aborted: true };
                    }
                } else {
                    break;
                }
            }
        }
        
        return { ok: false, error: lastError, retryable: retryable(lastError), attempts: retries + 1 };
    }

    async function withTimeout(promise, timeoutMs, options = {}) {
        const { signal } = options;
        const timeout = new Promise((_, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timeoutId);
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            }
        });
        
        try {
            const result = await Promise.race([promise, timeout]);
            return { ok: true, data: result };
        } catch (error) {
            return { ok: false, error, timeout: error.message?.includes('timed out'), aborted: error.name === 'AbortError' };
        }
    }

    if (global) {
        global.UtilsRetry = {
            withRetry,
            withTimeout
        };
    }

})();