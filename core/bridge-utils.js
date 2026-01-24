(function() {
    'use strict';

    function setupPageContextBridge() {
        if (!chrome || !chrome.runtime || !chrome.runtime.getURL) {
            console.warn('Chrome runtime API not available');
            return;
        }

        window.addEventListener('extensionBridgeResponse', (event) => {
            window.lastBridgeResponse = event.detail;
        });

        const existingScript = document.querySelector('#extension-bridge-script');
        if (existingScript) {
            existingScript.remove();
        }

        const script = document.createElement('script');
        script.id = 'extension-bridge-script';
        script.src = chrome.runtime.getURL('assets/bridge.js');

        (document.head || document.documentElement).appendChild(script);
    }

    async function callBridgeMethod(action, data, timeout = null) {
        return new Promise((resolve, reject) => {
            const requestId = Date.now() + Math.random();

            const handler = (event) => {
                if (event.detail.requestId === requestId) {
                    window.removeEventListener('extensionBridgeResponse', handler);

                    if (event.detail.success) {
                        resolve(event.detail.result);
                    } else {
                        reject(new Error(event.detail.error));
                    }
                }
            };

            window.addEventListener('extensionBridgeResponse', handler);

            window.dispatchEvent(new CustomEvent('extensionBridgeRequest', {
                detail: { action, data, requestId }
            }));

            const timeoutMs = timeout || (action === 'sendTrade' ? 30000 : 5000);
            setTimeout(() => {
                window.removeEventListener('extensionBridgeResponse', handler);
                reject(new Error('Bridge request timeout'));
            }, timeoutMs);
        });
    }

    function waitForAngularViaBridge() {
        return new Promise(async (resolve) => {
            let attempts = 0;
            const maxAttempts = 20;

            async function checkAngularViaBridge() {
                attempts++;

                try {
                    const result = await callBridgeMethod('checkAngular');

                    if (result.ready) {
                        resolve(true);
                        return;
                    }
                } catch (error) {
                }

                if (attempts >= maxAttempts) {
                    resolve(false);
                    return;
                }

                setTimeout(checkAngularViaBridge, 200);
            }

            checkAngularViaBridge();
        });
    }

    let csrfTokenCache = {
        token: null,
        timestamp: 0
    };
    const CSRF_TOKEN_CACHE_DURATION = 60 * 1000;

    async function getRobloxCSRFToken() {
        const now = Date.now();
        
        if (csrfTokenCache.token && (now - csrfTokenCache.timestamp) < CSRF_TOKEN_CACHE_DURATION) {
            return csrfTokenCache.token;
        }

        try {
            const response = await fetch('https://auth.roblox.com/v1/logout', {
                method: 'POST',
                credentials: 'include'
            });

            const csrfToken = response.headers.get('x-csrf-token');
            
            if (csrfToken) {
                csrfTokenCache = {
                    token: csrfToken,
                    timestamp: now
                };
            }
            
            return csrfToken;
        } catch (error) {
            return null;
        }
    }

    function waitForPageAndAngularReady() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30;

            function checkForAngularScript() {
                attempts++;

                if (window.angular) {
                    waitForAngularAndCache().then(resolve);
                } else {
                    const angularScripts = Array.from(document.scripts).filter(script =>
                        script.src && script.src.includes('angular') ||
                        script.textContent && script.textContent.includes('angular')
                    );

                    if (attempts < maxAttempts) {
                        setTimeout(checkForAngularScript, 100);
                    } else {
                        resolve(null);
                    }
                }
            }

            checkForAngularScript();
        });
    }

    function waitForAngularAndCache() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 150;

            const checkAngular = () => {
                attempts++;

                if (window.angular) {
                    const modules = window.angular._getModules ? window.angular._getModules() : [];

                    const tradesElement = document.querySelector('[trades]');
                    const hasTradesElement = !!tradesElement;
                    const isTradesElementVisible = tradesElement && tradesElement.offsetHeight > 0;

                    if (window.angular && window.angular.element && tradesElement) {
                        try {
                            const ngElement = window.angular.element(tradesElement);

                            if (ngElement && ngElement.injector) {
                                const injector = ngElement.injector();

                                if (injector) {
                                    try {
                                        const tradesService = injector.get('tradesService');

                                        if (tradesService && tradesService.sendTrade) {
                                            resolve(tradesService);
                                            return;
                                        }
                                    } catch (serviceError) {
                                    }
                                }
                            }
                        } catch (elementError) {
                        }
                    }
                }

                if (attempts < maxAttempts) {
                    setTimeout(checkAngular, 100);
                } else {
                    try {
                        if (window.angular && window.angular.element) {
                            const testElement = document.querySelector('[trades]');
                            if (testElement) {
                                const testNgElement = window.angular.element(testElement);
                                const testInjector = testNgElement.injector();
                                const testService = testInjector.get('tradesService');
                                resolve(testService);
                                return;
                            }
                        }
                        resolve(null);
                    } catch (finalError) {
                        resolve(null);
                    }
                }
            };

            checkAngular();
        });
    }

    window.BridgeUtils = {
        setupPageContextBridge,
        callBridgeMethod,
        waitForAngularViaBridge,
        getRobloxCSRFToken,
        waitForPageAndAngularReady,
        waitForAngularAndCache
    };

    window.setupPageContextBridge = setupPageContextBridge;
    window.callBridgeMethod = callBridgeMethod;
    window.waitForAngularViaBridge = waitForAngularViaBridge;
    window.getRobloxCSRFToken = getRobloxCSRFToken;
    window.waitForPageAndAngularReady = waitForPageAndAngularReady;
    window.waitForAngularAndCache = waitForAngularAndCache;
})();
