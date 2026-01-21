(function() {
    'use strict';

    function cleanupTradeCategories() {
        const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
        const finalizedTrades = Storage.getAccount('finalizedExtensionTrades', []);

        let moveCount = 0;

        const toMove = pendingTrades.filter(trade =>
            trade.status && ['declined', 'accepted', 'completed', 'expired'].includes(trade.status)
        );

        if (toMove.length > 0) {
            toMove.forEach(trade => {
                trade.finalizedAt = trade.finalizedAt || Date.now();
                finalizedTrades.push(trade);
            });

            const remainingPending = pendingTrades.filter(trade => !toMove.includes(trade));
            Storage.setAccount('pendingExtensionTrades', remainingPending);
            Storage.setAccount('finalizedExtensionTrades', finalizedTrades);
            moveCount = toMove.length;
        }

        return moveCount;
    }

    function cleanupOldNotifications() {
        const notifiedTrades = Storage.getAccount('notifiedTrades', []);
        if (notifiedTrades.length > 1000) {
            Storage.setAccount('notifiedTrades', notifiedTrades.slice(-500));
        }
    }

    window.TradeStatusCleanup = {
        cleanupTradeCategories,
        cleanupOldNotifications
    };

    window.cleanupTradeCategories = cleanupTradeCategories;
    window.cleanupOldNotifications = cleanupOldNotifications;

    const notificationCleanupInterval = setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
    if (window.tradeStatusIntervals) {
        window.tradeStatusIntervals.add(notificationCleanupInterval);
    } else {
        window.tradeStatusIntervals = new Set([notificationCleanupInterval]);
    }
    cleanupOldNotifications();

})();