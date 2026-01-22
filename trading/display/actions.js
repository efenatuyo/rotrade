(function() {
    'use strict';

    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;
    
    function getDeclineTrades() {
        return window.ModuleRegistry?.getSafe('DeclineTrades') || window.DeclineTrades;
    }

    async function handleAutoTradeActions(e) {
        if (e.target.classList.contains('delete-auto-trade')) {
            const tradeId = e.target.getAttribute('data-trade-id');
            if (tradeId) {
                const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
                const matchingCount = pendingTrades.filter(trade => {
                    return trade.autoTradeId === tradeId || 
                           String(trade.autoTradeId) === String(tradeId);
                }).length;

                const checkboxLabel = matchingCount > 0 
                    ? `Also decline all ${matchingCount} outbound trade${matchingCount !== 1 ? 's' : ''} from this configuration`
                    : null;

                const result = await Dialogs.confirm(
                    'Delete Auto Trade', 
                    'Are you sure you want to delete this auto trade?', 
                    'Delete', 
                    'Cancel',
                    checkboxLabel ? { checkbox: { label: checkboxLabel } } : {}
                );

                if (result && (result === true || result.confirmed)) {
                    const autoTrades = Storage.getAccount('autoTrades', []);

                    const updatedTrades = autoTrades.filter(trade => {
                        const match = trade.id !== tradeId &&
                                     String(trade.id) !== String(tradeId) &&
                                     trade.id !== parseInt(tradeId);
                        return match;
                    });

                    Storage.setAccount('autoTrades', updatedTrades);

                    const shouldDecline = result && typeof result === 'object' && result.checkbox === true;
                    
                    if (shouldDecline) {
                        let DeclineTrades = getDeclineTrades();
                        
                        if (!DeclineTrades) {
                            for (let i = 0; i < 10; i++) {
                                await new Promise(resolve => setTimeout(resolve, 100));
                                DeclineTrades = getDeclineTrades();
                                if (DeclineTrades) {
                                    break;
                                }
                            }
                        }
                        
                        if (!DeclineTrades) {
                            if (window.extensionAlert) {
                                window.extensionAlert('Error', 'DeclineTrades module not available. Please refresh the page.', 'error');
                            }
                            return;
                        }
                        
                        if (!DeclineTrades.declineMatchingOutboundTrades) {
                            if (window.extensionAlert) {
                                window.extensionAlert('Error', 'declineMatchingOutboundTrades function not available', 'error');
                            }
                            return;
                        }
                        
                        try {
                            DeclineTrades.declineMatchingOutboundTrades(tradeId).then(declineResult => {
                                if (declineResult.declined > 0 || declineResult.failed > 0) {
                                    if (window.extensionAlert) {
                                        window.extensionAlert(
                                            'Trades Declined', 
                                            `Successfully declined ${declineResult.declined} outbound trade${declineResult.declined !== 1 ? 's' : ''}.${declineResult.failed > 0 ? ` ${declineResult.failed} failed.` : ''}`,
                                            'info'
                                        );
                                    }
                                }

                                if (window.loadOutboundTrades) {
                                    setTimeout(() => {
                                        window.loadOutboundTrades();
                                    }, 500);
                                }
                            }).catch(error => {
                                if (window.extensionAlert) {
                                    window.extensionAlert('Error', 'Failed to decline trades: ' + (error.message || 'Unknown error'), 'error');
                                }
                            });
                        } catch (error) {
                            if (window.extensionAlert) {
                                window.extensionAlert('Error', 'Failed to call decline function: ' + (error.message || 'Unknown error'), 'error');
                            }
                        }
                    }

                    if (window.displayAutoTrades) {
                        window.displayAutoTrades(updatedTrades);
                    }
                }
            }
        } else if (e.target.classList.contains('edit-auto-trade')) {
            const tradeId = e.target.getAttribute('data-trade-id');
            if (tradeId) {
                const autoTrades = Storage.getAccount('autoTrades', []);

                let tradeToEdit = autoTrades.find(trade => trade.id === tradeId);

                if (!tradeToEdit) {
                    tradeToEdit = autoTrades.find(trade => String(trade.id) === String(tradeId));
                }

                if (!tradeToEdit && !isNaN(tradeId)) {
                    tradeToEdit = autoTrades.find(trade => trade.id === parseInt(tradeId));
                }

                if (tradeToEdit) {
                    Storage.set('editingTrade', tradeToEdit);
                    const pathname = window.location.pathname;
                    const langMatch = pathname.match(/^\/([a-z]{2})\//);
                    const langPrefix = langMatch ? `/${langMatch[1]}` : '';
                    window.location.href = langPrefix + '/auto-trades/create';
                }
            }
        }
    }

    window.TradeDisplayActions = {
        handleAutoTradeActions
    };

})();