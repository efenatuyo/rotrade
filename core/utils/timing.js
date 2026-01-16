(function() {
    'use strict';

    function debounce(func, wait, options = {}) {
        const { leading = false, trailing = true, maxWait } = options;
        let timeoutId;
        let maxTimeoutId;
        let lastCallTime;
        let lastInvokeTime = 0;
        let lastArgs;
        let result;

        const invokeFunc = (time) => {
            const args = lastArgs;
            lastArgs = undefined;
            lastInvokeTime = time;
            result = func.apply(this, args);
            return result;
        };

        const leadingEdge = (time) => {
            lastInvokeTime = time;
            timeoutId = undefined;
            if (leading) {
                return invokeFunc(time);
            }
        };

        const trailingEdge = (time) => {
            timeoutId = undefined;
            if (trailing && lastArgs) {
                return invokeFunc(time);
            }
            lastArgs = undefined;
            return result;
        };

        const shouldInvoke = (time) => {
            const timeSinceLastCall = time - lastCallTime;
            const timeSinceLastInvoke = time - lastInvokeTime;
            return (
                lastCallTime === undefined ||
                timeSinceLastCall >= wait ||
                timeSinceLastCall < 0 ||
                (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
            );
        };

        const timerExpired = () => {
            const time = Date.now();
            if (shouldInvoke(time)) {
                return trailingEdge(time);
            }
            timeoutId = setTimeout(timerExpired, wait - (time - lastCallTime));
        };

        const maxTimerExpired = () => {
            const time = Date.now();
            if (shouldInvoke(time)) {
                return trailingEdge(time);
            }
            maxTimeoutId = setTimeout(maxTimerExpired, maxWait - (time - lastInvokeTime));
        };

        const debounced = function(...args) {
            const time = Date.now();
            const isInvoking = shouldInvoke(time);

            lastArgs = args;
            lastCallTime = time;

            if (isInvoking) {
                if (timeoutId === undefined) {
                    return leadingEdge(lastCallTime);
                }
                if (maxWait !== undefined) {
                    clearTimeout(maxTimeoutId);
                    maxTimeoutId = setTimeout(maxTimerExpired, maxWait);
                    return invokeFunc(lastCallTime);
                }
            }
            if (timeoutId === undefined) {
                timeoutId = setTimeout(timerExpired, wait);
            }
            return result;
        };

        debounced.cancel = () => {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
            if (maxTimeoutId !== undefined) {
                clearTimeout(maxTimeoutId);
            }
            lastInvokeTime = 0;
            lastArgs = undefined;
            lastCallTime = undefined;
            timeoutId = undefined;
            maxTimeoutId = undefined;
        };

        debounced.flush = () => {
            return timeoutId === undefined ? result : trailingEdge(Date.now());
        };

        debounced.pending = () => {
            return timeoutId !== undefined;
        };

        if (options.signal) {
            options.signal.addEventListener('abort', () => {
                debounced.cancel();
            });
        }

        return debounced;
    }

    function throttle(func, wait, options = {}) {
        const { leading = true, trailing = true } = options;
        let timeoutId;
        let lastCallTime;
        let lastInvokeTime = 0;
        let lastArgs;
        let result;

        const shouldInvoke = (time) => {
            const timeSinceLastCall = time - lastCallTime;
            const timeSinceLastInvoke = time - lastInvokeTime;
            return (
                lastCallTime === undefined ||
                timeSinceLastCall >= wait ||
                timeSinceLastCall < 0 ||
                timeSinceLastInvoke >= wait
            );
        };

        const invokeFunc = (time) => {
            const args = lastArgs;
            lastArgs = undefined;
            lastInvokeTime = time;
            result = func.apply(this, args);
            return result;
        };

        const leadingEdge = (time) => {
            lastInvokeTime = time;
            timeoutId = setTimeout(timerExpired, wait);
            return leading ? invokeFunc(time) : result;
        };

        const trailingEdge = (time) => {
            timeoutId = undefined;
            if (trailing && lastArgs) {
                return invokeFunc(time);
            }
            lastArgs = undefined;
            return result;
        };

        const timerExpired = () => {
            const time = Date.now();
            if (trailing && lastArgs) {
                return trailingEdge(time);
            }
            timeoutId = undefined;
            return result;
        };

        const throttled = function(...args) {
            const time = Date.now();
            const isInvoking = shouldInvoke(time);

            lastArgs = args;
            lastCallTime = time;

            if (isInvoking) {
                if (timeoutId === undefined) {
                    return leadingEdge(lastCallTime);
                }
            }
            return result;
        };

        throttled.cancel = () => {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
            lastInvokeTime = 0;
            lastArgs = undefined;
            lastCallTime = undefined;
            timeoutId = undefined;
        };

        throttled.flush = () => {
            return timeoutId === undefined ? result : trailingEdge(Date.now());
        };

        throttled.pending = () => {
            return timeoutId !== undefined;
        };

        if (options.signal) {
            options.signal.addEventListener('abort', () => {
                throttled.cancel();
            });
        }

        return throttled;
    }

    function nextFrame(callback) {
        if (typeof requestAnimationFrame !== 'undefined') {
            return requestAnimationFrame(callback);
        }
        return setTimeout(callback, 0);
    }

    function delay(ms, options = {}) {
        const { signal } = options;
        
        return new Promise((resolve, reject) => {
            if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }

            const timeoutId = setTimeout(() => {
                if (!signal?.aborted) {
                    resolve();
                }
            }, ms);

            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timeoutId);
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            }
        });
    }

    const global = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
    
    if (global) {
        global.UtilsTiming = {
            debounce,
            throttle,
            nextFrame,
            delay
        };
    }

})();