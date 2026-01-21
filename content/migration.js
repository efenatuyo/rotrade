(function() {
    'use strict';

    function migrateTradesForRobux() {
        let migrated = 0;

        const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
        pendingTrades.forEach(trade => {
            if (trade.robuxGive === undefined) {
                trade.robuxGive = 0;
                migrated++;
            }
            if (trade.robuxGet === undefined) {
                trade.robuxGet = 0;
            }
        });
        Storage.setAccount('pendingExtensionTrades', pendingTrades);

        const finalizedTrades = Storage.getAccount('finalizedExtensionTrades', []);
        finalizedTrades.forEach(trade => {
            if (trade.robuxGive === undefined) {
                trade.robuxGive = 0;
                migrated++;
            }
            if (trade.robuxGet === undefined) {
                trade.robuxGet = 0;
            }
        });
        Storage.setAccount('finalizedExtensionTrades', finalizedTrades);
    }

    window.migrateTradesForRobux = migrateTradesForRobux;

})();