(function() {
    'use strict';

    function formatFinalizedTrade(trade, rolimonData, statusFilter) {
        let giving = Array.isArray(trade.giving) ? trade.giving : [];
        let receiving = Array.isArray(trade.receiving) ? trade.receiving : [];
        
        const utils = window.TradeLoadingUtils || {};
        const createRolimonsIndex = utils.createRolimonsIndex;
        const enrichItemWithRolimons = utils.enrichItemWithRolimons;

        if (Object.keys(rolimonData).length > 0 && createRolimonsIndex && enrichItemWithRolimons) {
            const { nameIndex } = createRolimonsIndex(rolimonData);
            
            for (let i = 0; i < giving.length; i++) {
                const enriched = enrichItemWithRolimons(giving[i], nameIndex);
                if (enriched.rap) giving[i] = { ...giving[i], rap: giving[i].rap || enriched.rap };
                if (enriched.value) giving[i] = { ...giving[i], value: giving[i].value || enriched.value };
                if (enriched.id) giving[i] = { ...giving[i], id: enriched.id, itemId: enriched.itemId };
            }

            for (let i = 0; i < receiving.length; i++) {
                const enriched = enrichItemWithRolimons(receiving[i], nameIndex);
                if (enriched.rap) receiving[i] = { ...receiving[i], rap: receiving[i].rap || enriched.rap };
                if (enriched.value) receiving[i] = { ...receiving[i], value: receiving[i].value || enriched.value };
                if (enriched.id) receiving[i] = { ...receiving[i], id: enriched.id, itemId: enriched.itemId };
            }
        }
        
        const timestamp = trade.finalizedAt || trade.created;
        const dateString = new Date(timestamp).toLocaleString();
        
        const base = {
            ...trade,
            giving: giving,
            receiving: receiving,
            robuxGive: Number(trade.robuxGive) || 0,
            robuxGet: Number(trade.robuxGet) || 0,
            type: 'Extension Trade',
            timestamp: timestamp
        };

        if (statusFilter === 'expired') {
            return { ...base, expired: dateString };
        } else if (statusFilter === 'countered') {
            return { ...base, countered: dateString };
        } else if (statusFilter === 'completed') {
            return { ...base, completed: dateString };
        }
        
        return base;
    }

    async function loadExpiredTrades() {
        Storage.clearCache('finalizedExtensionTrades');
        Storage.flush();
        const finalizedTrades = Storage.get('finalizedExtensionTrades', []);

        let rolimonData = {};
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchRolimons'
            });
            if (response.success) {
                rolimonData = response.data.items || {};
            }
        } catch (error) {
        }

        const expiredTrades = finalizedTrades
            .filter(trade => {
                const status = (trade.status || '').toLowerCase();
                const robloxStatus = (trade.robloxStatus || '').toLowerCase();
                return status === 'expired' || status === 'declined' || robloxStatus === 'expired';
            })
            .map(trade => formatFinalizedTrade(trade, rolimonData, 'expired'));

        const container = document.getElementById('expired-container');
        if (!container) {
            console.warn('Expired container not found');
            return;
        }

        window.expiredTrades = expiredTrades;
        
        if (window.preloadTradeThumbnails) {
            window.preloadTradeThumbnails(expiredTrades);
        }
        
        if (window.displayTrades) {
            window.displayTrades(expiredTrades, 'expired-container');
        } else if (typeof TradeDisplay !== 'undefined' && TradeDisplay.displayTrades) {
            TradeDisplay.displayTrades(expiredTrades, 'expired-container');
        }
    }

    async function loadCounteredTrades() {
        Storage.clearCache('finalizedExtensionTrades');
        Storage.flush();
        const finalizedTrades = Storage.get('finalizedExtensionTrades', []);

        let rolimonData = {};
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchRolimons'
            });
            if (response.success) {
                rolimonData = response.data.items || {};
            }
        } catch (error) {
        }

        const counteredTrades = finalizedTrades
            .filter(trade => {
                const status = (trade.status || '').toLowerCase();
                return status === 'countered';
            })
            .map(trade => formatFinalizedTrade(trade, rolimonData, 'countered'));

        const container = document.getElementById('countered-container');
        if (!container) {
            console.warn('Countered container not found');
            return;
        }

        window.counteredTrades = counteredTrades;
        
        if (window.preloadTradeThumbnails) {
            window.preloadTradeThumbnails(counteredTrades);
        }
        
        if (window.displayTrades) {
            window.displayTrades(counteredTrades, 'countered-container');
        } else if (typeof TradeDisplay !== 'undefined' && TradeDisplay.displayTrades) {
            TradeDisplay.displayTrades(counteredTrades, 'countered-container');
        }
    }

    async function loadCompletedTrades() {
        Storage.clearCache('finalizedExtensionTrades');
        Storage.flush();
        const finalizedTrades = Storage.get('finalizedExtensionTrades', []);

        let rolimonData = {};
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchRolimons'
            });
            if (response.success) {
                rolimonData = response.data.items || {};
            }
        } catch (error) {
        }

        const completedTrades = finalizedTrades
            .filter(trade => {
                const status = (trade.status || '').toLowerCase();
                return status === 'completed' || status === 'accepted';
            })
            .map(trade => formatFinalizedTrade(trade, rolimonData, 'completed'));

        const container = document.getElementById('completed-container');
        if (!container) {
            console.warn('Completed container not found');
            return;
        }

        window.completedTrades = completedTrades;
        
        if (window.preloadTradeThumbnails) {
            window.preloadTradeThumbnails(completedTrades);
        }
        
        if (window.displayTrades) {
            window.displayTrades(completedTrades, 'completed-container');
        } else if (typeof TradeDisplay !== 'undefined' && TradeDisplay.displayTrades) {
            TradeDisplay.displayTrades(completedTrades, 'completed-container');
        }
    }

    window.TradeLoadingFinalized = {
        loadExpiredTrades,
        loadCounteredTrades,
        loadCompletedTrades
    };

    window.loadExpiredTrades = loadExpiredTrades;
    window.loadCounteredTrades = loadCounteredTrades;
    window.loadCompletedTrades = loadCompletedTrades;

})();