(function() {
    'use strict';

    function createAutoTrade() {
        const selectedInventory = document.querySelectorAll('#inventory-grid .item-card.selected');
        const selectedCatalog = document.querySelectorAll('#catalog-grid .item-card[data-quantity]:not([data-quantity="0"])');

        const totalCatalogItems = Array.from(selectedCatalog).reduce((total, item) => {
            return total + (parseInt(item.dataset.quantity) || 0);
        }, 0);

        if (selectedInventory.length === 0 || totalCatalogItems === 0) {
            Dialogs.alert('Selection Required', 'Please select items from both your inventory and the catalog', 'error');
            return;
        }

        if (selectedInventory.length > 4) {
            Dialogs.alert('Too Many Items', 'You can only select up to 4 items from your inventory.', 'error');
            return;
        }

        if (totalCatalogItems > 4) {
            Dialogs.alert('Too Many Items', 'You can only receive up to 4 items total. You currently have ' + totalCatalogItems + ' items selected.', 'error');
            return;
        }

        const nameInput = document.getElementById('auto-trade-name') ||
                          document.querySelector('input[placeholder*="trade name"]') ||
                          document.querySelector('input[placeholder*="Trade name"]') ||
                          document.querySelector('input[placeholder*="Enter your trade name"]') ||
                          document.querySelector('.trade-settings input[type="text"]');
        const autoTradeName = nameInput ? nameInput.value.trim() : '';

        if (!autoTradeName) {
            Dialogs.alert('Name Required', 'Please enter a name for your auto trade', 'error');
            if (nameInput) nameInput.focus();
            return;
        }

        const robuxGive = parseInt(document.getElementById('robux-give')?.value) || 0;
        const robuxGet = parseInt(document.getElementById('robux-get')?.value) || 0;

        if (!window.validateRobuxLimits(robuxGive, robuxGet)) {
            return;
        }

        const settings = {
            maxTrades: document.getElementById('max-trades')?.value || 1
        };

        const isEditMode = window.editingTradeId !== undefined;
        const tradeId = isEditMode ? window.editingTradeId : Date.now();

        const autoTradeData = {
            id: tradeId,
            name: autoTradeName,
            status: 'incomplete',
            giving: Array.from(selectedInventory).map(item => ({
                name: item.dataset.item,
                value: parseInt(item.dataset.value),
                rap: parseInt(item.dataset.rap)
            })),
            receiving: Array.from(selectedCatalog).flatMap(item => {
                const quantity = parseInt(item.dataset.quantity) || 0;

                return Array(quantity).fill().map(() => ({
                    name: item.dataset.item,
                    value: parseInt(item.dataset.value),
                    rap: parseInt(item.dataset.rap)
                }));
            }).filter(item => item),

            robuxGive: robuxGive,
            robuxGet: robuxGet,
            settings: {
                maxTradesPerDay: parseInt(settings.maxTrades),
                tradesExecutedToday: 0
            },
            created: isEditMode ? undefined : new Date().toISOString(),
            lastExecuted: null
        };

        if (!isEditMode) {
            autoTradeData.created = new Date().toISOString();
        }

        let autoTrades = Storage.getAccount('autoTrades', []);

        if (isEditMode) {
            const tradeIndex = autoTrades.findIndex(trade => trade.id === tradeId || String(trade.id) === String(tradeId));
            if (tradeIndex !== -1) {
                autoTradeData.created = autoTrades[tradeIndex].created;
                autoTrades[tradeIndex] = autoTradeData;
            } else {
                autoTrades.push(autoTradeData);
            }
        } else {
            autoTrades.push(autoTradeData);
        }

        Storage.setAccount('autoTrades', autoTrades);
        Storage.flush();

        if (isEditMode) {
            window.editingTradeId = undefined;
        }

        window.location.href = '/auto-trades';
    }

    async function deleteAutoTrade(id) {
        const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
        const matchingCount = pendingTrades.filter(trade => {
            return trade.autoTradeId === id || 
                   String(trade.autoTradeId) === String(id);
        }).length;

        const checkboxLabel = matchingCount > 0 
            ? `Also decline all ${matchingCount} outbound trade${matchingCount !== 1 ? 's' : ''} from this configuration`
            : null;

        const result = await Dialogs.confirm(
            'Delete Auto Trade', 
            'Are you sure you want to delete this auto trade? This action cannot be undone.', 
            'Delete', 
            'Cancel',
            checkboxLabel ? { checkbox: { label: checkboxLabel } } : {}
        );

        if (result && (result === true || result.confirmed)) {
            let autoTrades = Storage.getAccount('autoTrades', []);
            autoTrades = autoTrades.filter(trade => trade.id != id);
            Storage.setAccount('autoTrades', autoTrades);

            if (result && typeof result === 'object' && result.checkbox === true && DeclineTrades && DeclineTrades.declineMatchingOutboundTrades) {
                DeclineTrades.declineMatchingOutboundTrades(id).then(declineResult => {
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
                });
            }

            const card = document.querySelector(`[data-id="${id}"]`);
            if (card) {
                card.remove();
            }

            const remainingCards = document.querySelectorAll('.auto-trade-card');
            if (remainingCards.length === 0) {
                const container = document.getElementById('auto-trades-container');
                const emptyState = document.getElementById('empty-state');
                if (container && emptyState) {
                    container.style.display = 'none';
                    emptyState.style.display = 'block';
                }
            }
        }
    }

    window.TradeOperations = {
        createAutoTrade,
        deleteAutoTrade
    };

    window.createAutoTrade = createAutoTrade;
})();
