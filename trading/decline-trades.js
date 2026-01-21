(function() {
    'use strict';

    const Storage = (window.ModuleRegistry?.getSafe('Storage')) || window.Storage;
    const TradeNotificationQueue = (window.ModuleRegistry?.getSafe('TradeNotificationQueue')) || window.TradeNotificationQueue;

    let isDeclining = false;
    let shouldStopDeclining = false;
    let currentDeclineController = null;


    async function getCSRFToken() {
        try {
            const response = await fetch('https://auth.roblox.com/v1/logout', {
                method: 'POST',
                credentials: 'include'
            });
            return response.headers.get('x-csrf-token');
        } catch (error) {
            return null;
        }
    }

    async function declineTrade(tradeId) {
        try {
            const csrfToken = await getCSRFToken();
            if (!csrfToken) {
                return { success: false, error: 'Failed to get CSRF token' };
            }

            const response = await fetch(`https://trades.roblox.com/v1/trades/${tradeId}/decline`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                }
            });

            if (response.ok) {
                return { success: true, result: await response.json().catch(() => ({})) };
            } else {
                const errorText = await response.text().catch(() => 'Unknown error');
                return { success: false, error: `HTTP ${response.status}: ${errorText.substring(0, 100)}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }


    async function processDeclineTrades(autoTradeId, tradesToDecline, initialDeclined = 0, initialFailed = 0, totalCount = 0) {
        if (isDeclining) {
            return { declined: initialDeclined, failed: initialFailed, total: totalCount || tradesToDecline.length };
        }

        isDeclining = true;
        shouldStopDeclining = false;
        currentDeclineController = new AbortController();

        const total = totalCount || tradesToDecline.length;
        let declined = initialDeclined;
        let failed = initialFailed;
        const declinedTradeIds = new Set();

        const progressDialogModule = window.DeclineProgressDialog || window.ModuleRegistry?.getSafe('DeclineProgressDialog');
        if (progressDialogModule && progressDialogModule.update) {
            progressDialogModule.update(declined, total, failed);
        }

        const retryDelay = 2000;
        const remainingTrades = [...tradesToDecline];
        
        try {
            while (remainingTrades.length > 0) {
                if (shouldStopDeclining || currentDeclineController.signal.aborted) {
                    break;
                }

                const trade = remainingTrades[0];
                let success = false;
                let tradeStillPending = true;

                while (!success && tradeStillPending) {
                    if (shouldStopDeclining || currentDeclineController.signal.aborted) {
                        break;
                    }

                    const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
                    const tradeExists = pendingTrades.some(t => {
                        const tradeNorm = String(t.id).trim();
                        const currentNorm = String(trade.id).trim();
                        return tradeNorm === currentNorm;
                    });

                    if (!tradeExists) {
                        tradeStillPending = false;
                        remainingTrades.shift();
                        break;
                    }

                    try {
                        const result = await declineTrade(trade.id);
                        if (result.success) {
                            success = true;
                            declined++;
                            declinedTradeIds.add(String(trade.id).trim());
                            
                            const updatedPending = Storage.getAccount('pendingExtensionTrades', []);
                            const filteredPending = updatedPending.filter(t => {
                                const tradeNorm = String(t.id).trim();
                                const currentNorm = String(trade.id).trim();
                                return tradeNorm !== currentNorm;
                            });
                            Storage.setAccount('pendingExtensionTrades', filteredPending);

                            const finalizedTrades = Storage.getAccount('finalizedExtensionTrades', []);
                            const finalizedTrade = {
                                ...trade,
                                status: 'declined',
                                finalizedAt: Date.now(),
                                robloxStatus: 'declined',
                                giving: Array.isArray(trade.giving) ? trade.giving : [],
                                receiving: Array.isArray(trade.receiving) ? trade.receiving : [],
                                robuxGive: Number(trade.robuxGive) || 0,
                                robuxGet: Number(trade.robuxGet) || 0,
                                userDeclined: true
                            };
                            finalizedTrades.push(finalizedTrade);
                            Storage.setAccount('finalizedExtensionTrades', finalizedTrades);

                            remainingTrades.shift();

                            const progressDialogModule = window.DeclineProgressDialog || window.ModuleRegistry?.getSafe('DeclineProgressDialog');
                            if (progressDialogModule && progressDialogModule.update) {
                                progressDialogModule.update(declined, total, failed);
                            }

                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                            failed++;
                            const progressDialogModule = window.DeclineProgressDialog || window.ModuleRegistry?.getSafe('DeclineProgressDialog');
                            if (progressDialogModule && progressDialogModule.update) {
                                progressDialogModule.update(declined, total, failed);
                            }
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                        }
                    } catch (error) {
                        failed++;
                        const progressDialogModule = window.DeclineProgressDialog || window.ModuleRegistry?.getSafe('DeclineProgressDialog');
                        if (progressDialogModule && progressDialogModule.update) {
                            progressDialogModule.update(declined, total, failed);
                        }
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }

                if (!success && !tradeStillPending) {
                    remainingTrades.shift();
                } else if (!success && tradeStillPending && (shouldStopDeclining || currentDeclineController.signal.aborted)) {
                    break;
                }
            }

        } finally {
            isDeclining = false;
            currentDeclineController = null;
            const progressDialogModule = window.DeclineProgressDialog || window.ModuleRegistry?.getSafe('DeclineProgressDialog');
            if (progressDialogModule && progressDialogModule.close) {
                setTimeout(() => {
                    progressDialogModule.close();
                }, 1000);
            }
        }

        return { declined, failed, total, resumed: false };
    }

    async function declineMatchingOutboundTrades(autoTradeId) {
        const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
        const matchingTrades = pendingTrades.filter(trade => {
            return trade.autoTradeId === autoTradeId || 
                   String(trade.autoTradeId) === String(autoTradeId);
        });

        if (matchingTrades.length === 0) {
            return { declined: 0, failed: 0, total: 0 };
        }

        let progressDialogModule = null;
        
        if (typeof window !== 'undefined') {
            progressDialogModule = window.DeclineProgressDialog;
            
            if (!progressDialogModule && window.ModuleRegistry) {
                progressDialogModule = window.ModuleRegistry.getSafe('DeclineProgressDialog');
            }
            
            if (!progressDialogModule && window.initializeModules) {
                window.initializeModules();
                await new Promise(resolve => setTimeout(resolve, 100));
                progressDialogModule = window.DeclineProgressDialog || window.ModuleRegistry?.getSafe('DeclineProgressDialog');
            }
        }

        if (progressDialogModule && typeof progressDialogModule.create === 'function') {
            try {
                progressDialogModule.create(() => {
                    shouldStopDeclining = true;
                    if (currentDeclineController) {
                        currentDeclineController.abort();
                    }
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
            }
        }

        return await processDeclineTrades(autoTradeId, matchingTrades);
    }


    window.DeclineTrades = {
        declineTrade,
        declineMatchingOutboundTrades
    };

})();
