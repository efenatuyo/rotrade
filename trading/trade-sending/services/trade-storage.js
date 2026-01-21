(function() {
    'use strict';

    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;

    function saveTradeToPending(tradeRecord) {
        try {
            const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
            const exists = pendingTrades.some(t => t.id === tradeRecord.id);
            if (!exists) {
                pendingTrades.push(tradeRecord);
                Storage.setAccount('pendingExtensionTrades', pendingTrades);
                Storage.flush();
            }
        } catch (error) {
            if (window.handleUnexpectedError) {
                window.handleUnexpectedError(error, {
                    module: 'TradeStorage',
                    action: 'saveTradeToPending',
                    severity: window.ERROR_SEVERITY?.HIGH || 'high'
                });
            }
        }
    }

    async function saveTradeAfterSending(tradeResult, opportunity, tradeId, userId) {
        try {
            if (!tradeResult || !tradeResult.tradeId) {
                return;
            }

            const yourIds = await Opportunities.getItemIdsFromTrade(opportunity.giving, window.rolimonData || {});
            const theirIds = await Opportunities.getItemIdsFromTrade(opportunity.receiving, window.rolimonData || {});
            const yourR = opportunity.robuxGive || 0;
            const theirR = opportunity.robuxGet || 0;

            Trades.logSentTradeCombo(userId, yourIds, theirIds, yourR, theirR);

            const baseTradeRecord = {
                id: tradeResult.tradeId,
                autoTradeId: tradeId,
                targetUserId: userId,
                created: Date.now(),
                tradeName: opportunity.name || 'Unknown Trade',
                giving: opportunity.giving || [],
                receiving: opportunity.receiving || [],
                robuxGive: opportunity.robuxGive || 0,
                robuxGet: opportunity.robuxGet || 0,
                status: 'outbound'
            };

            try {
                const userResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
                const userData = await userResponse.json();
                const tradeRecord = {
                    ...baseTradeRecord,
                    user: userData.name || userData.displayName || `User ${userId}`
                };
                saveTradeToPending(tradeRecord);
            } catch (error) {
                const tradeRecord = {
                    ...baseTradeRecord,
                    user: `User ${userId}`
                };
                saveTradeToPending(tradeRecord);
            }

            const sentTradeKey = `${tradeId}-${userId}`;
            if (!window.sentTrades) window.sentTrades = new Set();
            window.sentTrades.add(sentTradeKey);

            const newCount = Trades.incrementTradeCount(tradeId);

            const autoTrades = Storage.getAccount('autoTrades', []);
            const storedTrade = autoTrades.find(at => at.id === tradeId);
            if (storedTrade) {
                const maxTrades = storedTrade.settings?.maxTrades || 5;
                const completionStatus = newCount >= maxTrades ? 'COMPLETE' : 'INCOMPLETE';
                storedTrade.completionStatus = completionStatus;
                storedTrade.tradesExecutedToday = newCount;
                Storage.setAccount('autoTrades', autoTrades);
            }

            Storage.setAccount('sentTrades', [...window.sentTrades]);
        } catch (error) {
            if (window.handleUnexpectedError) {
                window.handleUnexpectedError(error, {
                    module: 'TradeStorage',
                    action: 'saveTradeAfterSending',
                    severity: window.ERROR_SEVERITY?.HIGH || 'high'
                });
            }
        }
    }

    function refreshOutboundTrades() {
        if (window.location.pathname.includes('/auto-trades')) {
            setTimeout(() => {
                const outboundSection = document.getElementById('outbound-section');
                if (outboundSection && outboundSection.style.display === 'block') {
                    if (window.loadOutboundTrades) {
                        window.loadOutboundTrades();
                    } else if (typeof TradeLoading !== 'undefined' && TradeLoading.loadOutboundTrades) {
                        TradeLoading.loadOutboundTrades();
                    }
                }
            }, 500);
        }
    }

    window.TradeStorage = {
        saveTradeToPending,
        saveTradeAfterSending,
        refreshOutboundTrades
    };
})();
