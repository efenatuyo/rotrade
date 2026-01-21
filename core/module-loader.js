(function() {
    'use strict';

    function initializeModules() {
        if (!window.ModuleRegistry) {
            return;
        }

        const Registry = window.ModuleRegistry;

        if (window.Storage && !Registry.has('Storage')) {
            Registry.register('Storage', () => window.Storage);
        }

        if (window.Utils && !Registry.has('Utils')) {
            Registry.register('Utils', () => window.Utils);
        }

        if (window.API && !Registry.has('API')) {
            Registry.register('API', () => window.API);
        }

        if (window.TradeStatusNotifications && !Registry.has('TradeNotifications')) {
            Registry.register('TradeNotifications', () => window.TradeStatusNotifications);
        }

        if (window.TradeNotificationQueue && !Registry.has('TradeNotificationQueue')) {
            Registry.register('TradeNotificationQueue', ['TradeNotifications'], () => {
                return window.TradeNotificationQueue;
            });
        }

        if (window.DeclineProgressDialog && !Registry.has('DeclineProgressDialog')) {
            Registry.register('DeclineProgressDialog', () => window.DeclineProgressDialog);
        }

        if (window.DeclineTrades && !Registry.has('DeclineTrades')) {
            Registry.register('DeclineTrades', ['Storage', 'DeclineProgressDialog', 'TradeNotificationQueue'], () => {
                return window.DeclineTrades;
            });
        }

        if (window.TradeStatusTrades && !Registry.has('TradeStatusTrades')) {
            Registry.register('TradeStatusTrades', ['Storage', 'TradeNotificationQueue', 'TradeNotifications'], () => {
                return window.TradeStatusTrades;
            });
        }
    }

    function runInit() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeModules);
        } else {
            initializeModules();
        }
    }

    runInit();

    if (document.readyState === 'complete') {
        setTimeout(initializeModules, 0);
    }

    window.initializeModules = initializeModules;
})();
