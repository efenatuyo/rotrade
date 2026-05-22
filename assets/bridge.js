(function () {
    let _csrfToken = null;
    async function ensureCsrfToken(force) {
        if (_csrfToken && !force) return _csrfToken;
        try {
            const r = await fetch('https://auth.roblox.com/v1/logout', {
                method: 'POST',
                credentials: 'include',
            });
            const t = r.headers.get('x-csrf-token');
            if (t) _csrfToken = t;
        } catch (e) {}
        return _csrfToken;
    }
    async function postUsersBatch(batch) {
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        if (_csrfToken) headers['X-CSRF-TOKEN'] = _csrfToken;
        let response = await fetch('https://users.roblox.com/v1/users', {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({
                userIds: batch,
                excludeBannedUsers: false,
            }),
        });
        if (response.status === 403) {
            const fresh = response.headers.get('x-csrf-token');
            if (fresh) {
                _csrfToken = fresh;
            } else {
                await ensureCsrfToken(true);
            }
            const retryHeaders = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            };
            if (_csrfToken) retryHeaders['X-CSRF-TOKEN'] = _csrfToken;
            response = await fetch('https://users.roblox.com/v1/users', {
                method: 'POST',
                credentials: 'include',
                headers: retryHeaders,
                body: JSON.stringify({
                    userIds: batch,
                    excludeBannedUsers: false,
                }),
            });
        }
        if (!response.ok) return [];
        const data = await response.json();
        if (!data || !Array.isArray(data.data)) return [];
        return data.data.map((u) => ({
            id: u.id,
            name: u.name,
            displayName: u.displayName || u.name,
        }));
    }
    async function fetchUsernamesBatch(userIds) {
        const ids = [
            ...new Set(
                (Array.isArray(userIds) ? userIds : [])
                    .map((n) => (typeof n === 'number' ? n : parseInt(n)))
                    .filter((n) => Number.isFinite(n) && n > 0)
            ),
        ];
        if (ids.length === 0) return [];
        const out = [];
        for (let i = 0; i < ids.length; i += 100) {
            const slice = ids.slice(i, i + 100);
            try {
                const batch = await postUsersBatch(slice);
                out.push(...batch);
            } catch (e) {}
        }
        return out;
    }
    setupBridge();
    function waitForAngular() {
        if (window.angular && window.angular.element) {
            return;
        }
        setTimeout(waitForAngular, 100);
    }
    function setupBridge() {
        window.addEventListener('extensionBridgeRequest', async (event) => {
            const { action: action, data: data, requestId: requestId } = event.detail;
            try {
                let result;
                if (action === 'fetchUsernames') {
                    result = await fetchUsernamesBatch(data && data.userIds);
                } else if (action === 'checkAngular') {
                    if (!window.angular || !window.angular.element) {
                        result = {
                            ready: false,
                            reason: 'Angular not loaded',
                        };
                    } else {
                        const tradesElement = document.querySelector('[trades]');
                        if (!tradesElement) {
                            result = {
                                ready: false,
                                reason: 'No [trades] element',
                            };
                        } else {
                            try {
                                const injector = window.angular.element(tradesElement).injector();
                                const tradesService = injector.get('tradesService');
                                if (!tradesService || !tradesService.sendTrade) {
                                    result = {
                                        ready: false,
                                        reason: 'TradesService not available',
                                    };
                                } else {
                                    result = {
                                        ready: true,
                                        reason: 'Angular fully ready',
                                    };
                                }
                            } catch (angularError) {
                                result = {
                                    ready: false,
                                    reason: 'Angular error: ' + angularError.message,
                                };
                            }
                        }
                    }
                } else if (action === 'sendTrade') {
                    const tradesElement = document.querySelector('[trades]');
                    if (!tradesElement) {
                        throw new Error('No [trades] element found');
                    }
                    const injector = window.angular.element(tradesElement).injector();
                    const tradesService = injector.get('tradesService');
                    if (!tradesService || !tradesService.sendTrade) {
                        throw new Error('TradesService not available');
                    }
                    result = await tradesService.sendTrade(data);
                } else if (action === 'getTradeStatus') {
                    const tradesElement = document.querySelector('[trades]');
                    if (!tradesElement) {
                        throw new Error('No [trades] element found');
                    }
                    const injector = window.angular.element(tradesElement).injector();
                    const tradesService = injector.get('tradesService');
                    if (!tradesService || !tradesService.getTradeStatus) {
                        throw new Error('TradesService.getTradeStatus not available');
                    }
                    result = await tradesService.getTradeStatus(data.tradeId);
                } else if (action === 'declineTrade') {
                    const tradesElement = document.querySelector('[trades]');
                    if (!tradesElement) {
                        throw new Error('No [trades] element found');
                    }
                    const injector = window.angular.element(tradesElement).injector();
                    const tradesService = injector.get('tradesService');
                    if (!tradesService || !tradesService.declineTrade) {
                        throw new Error('TradesService.declineTrade not available');
                    }
                    result = await tradesService.declineTrade(data.tradeId);
                }
                window.dispatchEvent(
                    new CustomEvent('extensionBridgeResponse', {
                        detail: {
                            requestId: requestId,
                            success: true,
                            result: result,
                        },
                    })
                );
            } catch (error) {
                window.dispatchEvent(
                    new CustomEvent('extensionBridgeResponse', {
                        detail: {
                            requestId: requestId,
                            success: false,
                            error: error.message,
                        },
                    })
                );
            }
        });
    }
    waitForAngular();
})();
