(function() {
    'use strict';

    const usernameCache = new Map();
    const usernameFetchPromises = new Map();

    function saveTradeToPending(tradeRecord) {
        const pendingTrades = Storage.get('pendingExtensionTrades', []);
        const exists = pendingTrades.some(t => t.id === tradeRecord.id);
        if (!exists) {
            pendingTrades.push(tradeRecord);
            Storage.set('pendingExtensionTrades', pendingTrades);
            Storage.flush();
        }
    }

    async function fetchUsernameCached(userId) {
        if (usernameCache.has(userId)) {
            return usernameCache.get(userId);
        }

        if (usernameFetchPromises.has(userId)) {
            return usernameFetchPromises.get(userId);
        }

        const fetchPromise = (async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const userData = await response.json();
                const username = userData.name || userData.displayName || `User ${userId}`;
                usernameCache.set(userId, username);
                usernameFetchPromises.delete(userId);
                return username;
            } catch (error) {
                const username = `User ${userId}`;
                usernameCache.set(userId, username);
                usernameFetchPromises.delete(userId);
                return username;
            }
        })();

        usernameFetchPromises.set(userId, fetchPromise);
        return fetchPromise;
    }

    async function sendSingleTrade(opportunity, abortSignal, shouldStopCheck) {
        if (shouldStopCheck && shouldStopCheck()) {
            return { success: false, reason: 'aborted' };
        }

        const userId = opportunity.targetUserId;
        const tradeId = opportunity.id;

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        let canTradeResponse = null;
        try {
            canTradeResponse = await chrome.runtime.sendMessage({
                action: 'checkCanTradeWith',
                userId: userId
            });
        } catch (e) {
        }

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        if (canTradeResponse?.success && canTradeResponse.data && !canTradeResponse.data.canTrade) {
            return { success: false, reason: 'cannot_trade' };
        }

        const currentUserId = await Inventory.getCurrentUserId();
        if (!currentUserId) {
            return { success: false, reason: 'no_user_id' };
        }

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        const ourItemIds = await Opportunities.getItemIdsFromTrade(opportunity.giving, window.rolimonData || {});
        const theirItemIds = await Opportunities.getItemIdsFromTrade(opportunity.receiving, window.rolimonData || {});

        if (ourItemIds.length !== opportunity.giving.length || theirItemIds.length !== opportunity.receiving.length) {
            return { success: false, reason: 'missing_item_ids' };
        }

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        const autoInstancePayload = {
            trade: [
                {
                    user_id: currentUserId,
                    item_ids: ourItemIds,
                    robux: opportunity.robuxGive || 0
                },
                {
                    user_id: userId,
                    item_ids: theirItemIds,
                    robux: opportunity.robuxGet || 0
                }
            ]
        };

        const instanceResponse = await chrome.runtime.sendMessage({
            action: 'fetchAutoInstanceIds',
            payload: autoInstancePayload
        });

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        if (!instanceResponse.success || !instanceResponse.data || !instanceResponse.data.participants) {
            return { success: false, reason: 'instance_fetch_failed' };
        }

        const participants = instanceResponse.data.participants;
        const ourData = participants[String(currentUserId)];
        const theirData = participants[String(userId)];

        if (!ourData || !theirData || !ourData.instanceIds || !theirData.instanceIds) {
            return { success: false, reason: 'missing_instances' };
        }

        const ourInstanceIds = ourData.instanceIds.slice(0, ourItemIds.length);
        const theirInstanceIds = theirData.instanceIds.slice(0, theirItemIds.length);

        if (ourInstanceIds.length !== ourItemIds.length || theirInstanceIds.length !== theirItemIds.length) {
            return { success: false, reason: 'instance_count_mismatch' };
        }

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        const angularTradeData = {
            senderOffer: {
                userId: currentUserId,
                robux: opportunity.robuxGive || 0,
                collectibleItemInstanceIds: ourInstanceIds
            },
            recipientOffer: {
                userId: userId,
                robux: opportunity.robuxGet || 0,
                collectibleItemInstanceIds: theirInstanceIds
            }
        };

        try {
            const tradeResult = await BridgeUtils.callBridgeMethod('sendTrade', angularTradeData, 20000);
            if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
                return { success: false, reason: 'aborted' };
            }

            if (tradeResult && tradeResult.tradeId) {
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

                fetchUsernameCached(userId).then(username => {
                    const tradeRecord = {
                        ...baseTradeRecord,
                        user: username
                    };
                    saveTradeToPending(tradeRecord);
                });

                const sentTradeKey = `${tradeId}-${userId}`;
                window.sentTrades.add(sentTradeKey);
                Storage.set('sentTrades', [...window.sentTrades]);

                const newCount = Trades.incrementTradeCount(tradeId);
                const autoTrades = Storage.get('autoTrades', []);
                const storedTrade = autoTrades.find(at => at.id === tradeId);
                if (storedTrade) {
                    const maxTrades = storedTrade.settings?.maxTrades || 5;
                    const completionStatus = newCount >= maxTrades ? 'COMPLETE' : 'INCOMPLETE';
                    storedTrade.completionStatus = completionStatus;
                    storedTrade.tradesExecutedToday = newCount;
                    Storage.set('autoTrades', autoTrades);
                }

                window.currentOpportunities = window.currentOpportunities.filter(
                    opp => !(opp.id == tradeId && opp.targetUserId == userId)
                );
                window.filteredOpportunities = window.filteredOpportunities.filter(
                    opp => !(opp.id == tradeId && opp.targetUserId == userId)
                );

                return { success: true, tradeId: tradeResult.tradeId, opportunity };
            }
            
            return { success: false, reason: 'no_trade_id', error: null };
        } catch (error) {
            if (window.SendAllChallengeHandler && window.SendAllChallengeHandler.isChallengeError(error)) {
                return { success: false, reason: 'challenge_required', error };
            }
            
            return { success: false, reason: 'send_failed', error };
        }
    }

    window.SendAllTradeSender = {
        sendSingleTrade: sendSingleTrade
    };

})();
