(function() {
    'use strict';

    async function checkTradeStatus(tradeId) {
        try {
            const result = await BridgeUtils.callBridgeMethod('getTradeStatus', { tradeId }, 15000);
            return result;
        } catch (error) {
            if (error.message.includes('timeout')) {
                return { status: 'pending' };
            }
            return { status: 'pending' };
        }
    }

    async function updateTradeStatuses() {
        const pendingTrades = Storage.get('pendingExtensionTrades', []);
        if (pendingTrades.length === 0) return;

        const statusChecks = await Promise.all(
            pendingTrades.map(trade => checkTradeStatus(trade.id))
        );

        const finalizedTrades = Storage.get('finalizedExtensionTrades', []);
        const stillPending = [];

        pendingTrades.forEach((trade, index) => {
            const status = statusChecks[index].status;

            if (status === 'pending') {
                stillPending.push(trade);
            } else {
                finalizedTrades.push({
                    ...trade,
                    status: status,
                    finalizedAt: Date.now()
                });
            }
        });

        Storage.setBatch({
            'pendingExtensionTrades': stillPending,
            'finalizedExtensionTrades': finalizedTrades
        });
    }

    async function checkAndUpdateTradeStatuses() {
        const pendingTrades = Storage.get('pendingExtensionTrades', []);
        if (pendingTrades.length === 0) return;

        await checkRobloxTradeStatuses();
    }

    window.TradeStatusChecker = {
        checkTradeStatus,
        updateTradeStatuses,
        checkAndUpdateTradeStatuses
    };

    window.checkTradeStatus = checkTradeStatus;
    window.updateTradeStatuses = updateTradeStatuses;
    window.checkAndUpdateTradeStatuses = checkAndUpdateTradeStatuses;

})();