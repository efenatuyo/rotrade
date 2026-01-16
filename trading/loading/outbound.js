(function() {
    'use strict';

    async function loadOutboundTrades() {
        Storage.clearCache('pendingExtensionTrades');
        Storage.flush();
        const pendingTrades = Storage.get('pendingExtensionTrades', []);

        if (pendingTrades.length === 0) {
            if (window.displayTrades) {
                window.displayTrades([], 'outbound-container');
            }
            return;
        }

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

        const utils = window.TradeLoadingUtils || {};
        const createRolimonsIndex = utils.createRolimonsIndex;
        const enrichItemWithRolimons = utils.enrichItemWithRolimons;

        const formattedTrades = pendingTrades.map(trade => {
            let giving = Array.isArray(trade.giving) ? trade.giving : [];
            let receiving = Array.isArray(trade.receiving) ? trade.receiving : [];
            const robuxGive = Number(trade.robuxGive) || 0;
            const robuxGet = Number(trade.robuxGet) || 0;

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
            
            if ((giving.length > 0 || receiving.length > 0) || robuxGive > 0 || robuxGet > 0) {
                return {
                    ...trade,
                    giving: giving,
                    receiving: receiving,
                    robuxGive: robuxGive,
                    robuxGet: robuxGet,
                    timestamp: trade.created,
                    user: trade.user || `User ${trade.targetUserId}`,
                    status: 'outbound'
                };
            } else {
                return {
                    id: trade.id,
                    type: 'Extension Trade',
                    tradeName: trade.tradeName,
                    targetUserId: trade.targetUserId,
                    created: new Date(trade.created).toLocaleString(),
                    status: 'Pending'
                };
            }
        });

        const container = document.getElementById('outbound-container');
        if (!container) {
            console.warn('Outbound container not found');
            return;
        }

        window.outboundTrades = formattedTrades;
        
        if (window.preloadTradeThumbnails) {
            window.preloadTradeThumbnails(formattedTrades);
        }
        
        if (window.displayTrades) {
            window.displayTrades(formattedTrades, 'outbound-container');
        } else if (typeof TradeDisplay !== 'undefined' && TradeDisplay.displayTrades) {
            TradeDisplay.displayTrades(formattedTrades, 'outbound-container');
        } else {
            console.error('displayTrades function not found');
        }
    }

    window.TradeLoadingOutbound = {
        loadOutboundTrades
    };

    window.loadOutboundTrades = loadOutboundTrades;

})();