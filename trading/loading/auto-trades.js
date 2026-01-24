(function() {
    'use strict';

    async function loadAutoTradeData() {
        if (!Storage.getCurrentAccountId || !Storage.getCurrentAccountId()) {
            if (window.API && window.API.getCurrentUserId) {
                const userId = window.API.getCurrentUserIdSync ? window.API.getCurrentUserIdSync() : (await window.API.getCurrentUserId());
                if (userId) {
                    Storage.setCurrentAccountId(userId);
                    if (Storage.preloadAccountData) {
                        await Storage.preloadAccountData(userId);
                    }
                }
            }
        }
        let autoTrades = await Storage.getAccountAsync('autoTrades', []);

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

        if (Object.keys(rolimonData).length > 0) {
            const utils = window.TradeLoadingUtils || {};
            const createRolimonsIndex = utils.createRolimonsIndex;
            const enrichItemWithRolimons = utils.enrichItemWithRolimons;
            
            if (createRolimonsIndex && enrichItemWithRolimons) {
                const { nameIndex } = createRolimonsIndex(rolimonData);
                
                for (let i = 0; i < autoTrades.length; i++) {
                    const trade = autoTrades[i];
                    const giving = trade.giving || [];
                    const receiving = trade.receiving || [];
                    
                    for (let j = 0; j < giving.length; j++) {
                        giving[j] = enrichItemWithRolimons(giving[j], nameIndex);
                    }
                    
                    for (let j = 0; j < receiving.length; j++) {
                        receiving[j] = enrichItemWithRolimons(receiving[j], nameIndex);
                    }
                    
                    autoTrades[i] = {
                        ...trade,
                        giving,
                        receiving
                    };
                }
            }
        }

        if (typeof TradeDisplay !== 'undefined' && TradeDisplay.displayAutoTrades) {
            TradeDisplay.displayAutoTrades(autoTrades);
        } else if (window.displayAutoTrades) {
            window.displayAutoTrades(autoTrades);
        }
    }

    window.TradeLoadingAutoTrades = {
        loadAutoTradeData
    };

    window.loadAutoTradeData = loadAutoTradeData;

})();