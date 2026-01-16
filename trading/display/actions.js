(function() {
    'use strict';

    function handleAutoTradeActions(e) {
        if (e.target.classList.contains('delete-auto-trade')) {
            const tradeId = e.target.getAttribute('data-trade-id');
            if (tradeId) {
                Dialogs.confirm('Delete Auto Trade', 'Are you sure you want to delete this auto trade?', 'Delete', 'Cancel').then(confirmed => {
                    if (confirmed) {
                        const autoTrades = Storage.get('autoTrades', []);

                        const updatedTrades = autoTrades.filter(trade => {
                            const match = trade.id !== tradeId &&
                                         String(trade.id) !== String(tradeId) &&
                                         trade.id !== parseInt(tradeId);
                            return match;
                        });

                        Storage.set('autoTrades', updatedTrades);
                        if (window.displayAutoTrades) {
                            window.displayAutoTrades(updatedTrades);
                        }
                    }
                });
            }
        } else if (e.target.classList.contains('edit-auto-trade')) {
            const tradeId = e.target.getAttribute('data-trade-id');
            if (tradeId) {
                const autoTrades = Storage.get('autoTrades', []);

                let tradeToEdit = autoTrades.find(trade => trade.id === tradeId);

                if (!tradeToEdit) {
                    tradeToEdit = autoTrades.find(trade => String(trade.id) === String(tradeId));
                }

                if (!tradeToEdit && !isNaN(tradeId)) {
                    tradeToEdit = autoTrades.find(trade => trade.id === parseInt(tradeId));
                }

                if (tradeToEdit) {
                    Storage.set('editingTrade', tradeToEdit);
                    window.location.href = '/auto-trades/create';
                }
            }
        }
    }

    window.TradeDisplayActions = {
        handleAutoTradeActions
    };

})();