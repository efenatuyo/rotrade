(function() {

    function waitForAngular() {
        if (window.angular && window.angular.element) {
            setupBridge();
        } else {
            setTimeout(waitForAngular, 100);
        }
    }

    function setupBridge() {

        window.addEventListener('extensionBridgeRequest', async (event) => {
            const { action, data, requestId } = event.detail;

            try {
                let result;

                if (action === 'checkAngular') {

                    if (!window.angular || !window.angular.element) {
                        result = { ready: false, reason: 'Angular not loaded' };
                    } else {
                        const tradesElement = document.querySelector('[trades]');
                        if (!tradesElement) {
                            result = { ready: false, reason: 'No [trades] element' };
                        } else {
                            try {
                                const injector = window.angular.element(tradesElement).injector();
                                const tradesService = injector.get('tradesService');

                                if (!tradesService || !tradesService.sendTrade) {
                                    result = { ready: false, reason: 'TradesService not available' };
                                } else {
                                    result = { ready: true, reason: 'Angular fully ready' };
                                }
                            } catch (angularError) {
                                result = { ready: false, reason: 'Angular error: ' + angularError.message };
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
                }

                window.dispatchEvent(new CustomEvent('extensionBridgeResponse', {
                    detail: { requestId, success: true, result }
                }));

            } catch (error) {

                window.dispatchEvent(new CustomEvent('extensionBridgeResponse', {
                    detail: { requestId, success: false, error: error.message }
                }));
            }
        });

    }

    waitForAngular();
})();
