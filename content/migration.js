(function() {
    'use strict';

    function migrateTradesForRobux() {
        let migrated = 0;

        const pendingTrades = Storage.get('pendingExtensionTrades', []);
        pendingTrades.forEach(trade => {
            if (trade.robuxGive === undefined) {
                trade.robuxGive = 0;
                migrated++;
            }
            if (trade.robuxGet === undefined) {
                trade.robuxGet = 0;
            }
        });
        Storage.set('pendingExtensionTrades', pendingTrades);

        const finalizedTrades = Storage.get('finalizedExtensionTrades', []);
        finalizedTrades.forEach(trade => {
            if (trade.robuxGive === undefined) {
                trade.robuxGive = 0;
                migrated++;
            }
            if (trade.robuxGet === undefined) {
                trade.robuxGet = 0;
            }
        });
        Storage.set('finalizedExtensionTrades', finalizedTrades);
    }

    window.migrateTradesForRobux = migrateTradesForRobux;

})();