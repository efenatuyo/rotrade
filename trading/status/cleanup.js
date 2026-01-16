(function() {
    'use strict';

    function cleanupTradeCategories() {
        const pendingTrades = Storage.get('pendingExtensionTrades', []);
        const finalizedTrades = Storage.get('finalizedExtensionTrades', []);

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
            Storage.set('pendingExtensionTrades', remainingPending);
            Storage.set('finalizedExtensionTrades', finalizedTrades);
            moveCount = toMove.length;
        }

        return moveCount;
    }

    function cleanupOldNotifications() {
        const notifiedTrades = Storage.get('notifiedTrades', []);
        if (notifiedTrades.length > 1000) {
            Storage.set('notifiedTrades', notifiedTrades.slice(-500));
        }
    }

    window.TradeStatusCleanup = {
        cleanupTradeCategories,
        cleanupOldNotifications
    };

    window.cleanupTradeCategories = cleanupTradeCategories;
    window.cleanupOldNotifications = cleanupOldNotifications;

    // Cleanup old notifications periodically
    const notificationCleanupInterval = setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
    if (window.tradeStatusIntervals) {
        window.tradeStatusIntervals.add(notificationCleanupInterval);
    } else {
        window.tradeStatusIntervals = new Set([notificationCleanupInterval]);
    }
    cleanupOldNotifications();

})();