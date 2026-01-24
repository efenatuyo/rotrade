(function() {
    'use strict';

    const usernameCache = new Map();
    const usernameFetchPromises = new Map();

    async function saveTradeToPending(tradeRecord) {
        try {
            if (window.TradeStorage && window.TradeStorage.saveTradeToPending) {
                await window.TradeStorage.saveTradeToPending(tradeRecord);
                return;
            }
            const pendingTrades = await Storage.getAccountAsync('pendingExtensionTrades', []);
            const exists = pendingTrades.some(t => t.id === tradeRecord.id);
            if (!exists) {
                pendingTrades.push(tradeRecord);
                Storage.setAccount('pendingExtensionTrades', pendingTrades);
                await Storage.flush();
            }
        } catch (error) {
            if (window.handleUnexpectedError) {
                window.handleUnexpectedError(error, {
                    module: 'TradeSender',
                    action: 'saveTradeToPending',
                    severity: window.ERROR_SEVERITY?.HIGH || 'high'
                });
            }
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

    async function sendSingleTrade(opportunity, abortSignal, shouldStopCheck, onStatusUpdate) {
        if (shouldStopCheck && shouldStopCheck()) {
            return { success: false, reason: 'aborted' };
        }

        const userId = opportunity.targetUserId;
        const tradeId = opportunity.id;
        const username = opportunity.targetUser?.username || `User ${userId}`;

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        if (onStatusUpdate) {
            onStatusUpdate(1, 3, `Checking permissions for ${username}...`, 'pending');
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
            if (onStatusUpdate) {
                onStatusUpdate(1, 3, `Cannot trade with ${username} (owner settings)`, 'error');
            }
            return { success: false, reason: 'cannot_trade' };
        }

        if (onStatusUpdate) {
            onStatusUpdate(2, 3, `Fetching item instance IDs for ${username}...`, 'pending');
        }

        const currentUserId = Inventory.getCurrentUserId() || await Inventory.getCurrentUserIdAsync();
        if (!currentUserId) {
            return { success: false, reason: 'no_user_id' };
        }

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        const ourItemIds = await Opportunities.getItemIdsFromTrade(opportunity.giving, window.rolimonData || {});
        const theirItemIds = await Opportunities.getItemIdsFromTrade(opportunity.receiving, window.rolimonData || {});

        if (ourItemIds.length !== opportunity.giving.length || theirItemIds.length !== opportunity.receiving.length) {
            if (onStatusUpdate) {
                onStatusUpdate(2, 3, `Missing item IDs for ${username}`, 'error');
            }
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
            if (onStatusUpdate) {
                onStatusUpdate(2, 3, `Failed to fetch instance IDs for ${username}`, 'error');
            }
            return { success: false, reason: 'instance_fetch_failed' };
        }

        const participants = instanceResponse.data.participants;
        const ourData = participants[String(currentUserId)];
        const theirData = participants[String(userId)];

        if (!ourData || !theirData || !ourData.instanceIds || !theirData.instanceIds) {
            if (onStatusUpdate) {
                onStatusUpdate(2, 3, `Missing instance IDs for ${username}`, 'error');
            }
            return { success: false, reason: 'missing_instances' };
        }

        const ourInstanceIds = ourData.instanceIds.slice(0, ourItemIds.length);
        const theirInstanceIds = theirData.instanceIds.slice(0, theirItemIds.length);

        if (ourInstanceIds.length !== ourItemIds.length || theirInstanceIds.length !== theirItemIds.length) {
            if (onStatusUpdate) {
                onStatusUpdate(2, 3, `Instance count mismatch for ${username}`, 'error');
            }
            return { success: false, reason: 'instance_count_mismatch' };
        }

        if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
            return { success: false, reason: 'aborted' };
        }

        if (onStatusUpdate) {
            onStatusUpdate(3, 3, `Sending trade to ${username}...`, 'pending');
        }

        if (window.AutoConfirmer) {
            const autoConfirmerResult = await window.AutoConfirmer.sendTradeWithAutoConfirmer(
                opportunity,
                currentUserId,
                ourInstanceIds,
                theirInstanceIds,
                onStatusUpdate
            );

            if (autoConfirmerResult && autoConfirmerResult.success) {
                if (onStatusUpdate) {
                    onStatusUpdate(3, 3, `Trade sent successfully to ${username}`, 'success');
                }

                const yourIds = await Opportunities.getItemIdsFromTrade(opportunity.giving, window.rolimonData || {});
                const theirIds = await Opportunities.getItemIdsFromTrade(opportunity.receiving, window.rolimonData || {});
                const yourR = opportunity.robuxGive || 0;
                const theirR = opportunity.robuxGet || 0;

                Trades.logSentTradeCombo(userId, yourIds, theirIds, yourR, theirR);

                const baseTradeRecord = {
                    id: autoConfirmerResult.tradeId,
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

                fetchUsernameCached(userId).then(async username => {
                    const tradeRecord = {
                        ...baseTradeRecord,
                        user: username
                    };
                    await saveTradeToPending(tradeRecord);
                });

                const sentTradeKey = `${String(tradeId)}-${String(userId)}`;
                if (!window.sentTrades) {
                    const stored = Storage.getAccount('sentTrades', []);
                    window.sentTrades = new Set(stored.map(key => String(key)));
                }
                if (!window.sentTrades.has(sentTradeKey)) {
                    window.sentTrades.add(sentTradeKey);
                    Storage.setAccount('sentTrades', Array.from(window.sentTrades).map(key => String(key)));
                    Storage.flush();
                }

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

                const isSendingAllTrades = window.SendAllTrades && typeof window.SendAllTrades.isSendingAllTrades === 'function' && window.SendAllTrades.isSendingAllTrades();
                
                if (!isSendingAllTrades) {
                    if (storedTrade) {
                        const maxTrades = storedTrade.settings?.maxTrades || 5;
                        if (newCount >= maxTrades) {
                            window.currentOpportunities = (window.currentOpportunities || []).filter(
                                opp => String(opp.id) !== String(tradeId)
                            );
                            window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                                opp => String(opp.id) !== String(tradeId)
                            );
                        } else {
                            window.currentOpportunities = (window.currentOpportunities || []).filter(
                                opp => !(String(opp.id) === String(tradeId) && String(opp.targetUserId) === String(userId))
                            );
                            window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                                opp => !(String(opp.id) === String(tradeId) && String(opp.targetUserId) === String(userId))
                            );
                        }
                    } else {
                        window.currentOpportunities = (window.currentOpportunities || []).filter(
                            opp => !(String(opp.id) === String(tradeId) && String(opp.targetUserId) === String(userId))
                        );
                        window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                            opp => !(String(opp.id) === String(tradeId) && String(opp.targetUserId) === String(userId))
                        );
                    }
                    
                    if (window.Pagination) {
                        window.Pagination.setCurrentPage(1);
                        window.Pagination.displayCurrentPage();
                    }
                    if (window.updateTotalUsersInfo) {
                        window.updateTotalUsersInfo();
                    }
                    if (window.updateTradeFilterBar) {
                        window.updateTradeFilterBar();
                    }
                }

                return { success: true, tradeId: autoConfirmerResult.tradeId, opportunity };
            }

            if (autoConfirmerResult && autoConfirmerResult.useFallback) {
                if (autoConfirmerResult.expired) {
                }
            } else if (autoConfirmerResult && !autoConfirmerResult.success) {
                if (autoConfirmerResult.noFallback) {
                    return { success: false, reason: 'auto_confirmer_failed', error: autoConfirmerResult.error };
                }
                if (!autoConfirmerResult.useFallback) {
                    return { success: false, reason: 'auto_confirmer_failed', error: autoConfirmerResult.error };
                }
            }
        }

        const angularTradeData = {
            senderOffer: {
                userId: currentUserId,
                robux: opportunity.robuxGive || 0,
                collectibleItemInstanceIds: Array.isArray(ourInstanceIds) ? ourInstanceIds : []
            },
            recipientOffer: {
                userId: userId,
                robux: opportunity.robuxGet || 0,
                collectibleItemInstanceIds: Array.isArray(theirInstanceIds) ? theirInstanceIds : []
            }
        };

        try {
            const tradeResult = await BridgeUtils.callBridgeMethod('sendTrade', angularTradeData, 20000);
            if (abortSignal?.aborted || (shouldStopCheck && shouldStopCheck())) {
                return { success: false, reason: 'aborted' };
            }

            if (tradeResult && tradeResult.errors) {
                const hasPrivacyError = tradeResult.errors.some(e => e.code === 22);
                if (hasPrivacyError) {
                    if (!window.privacyRestrictedUsers) {
                        const stored = Storage.getAccount('privacyRestrictedUsers', []);
                        window.privacyRestrictedUsers = new Set(stored.map(id => String(id)));
                    }
                    window.privacyRestrictedUsers.add(String(userId));
                    Storage.setAccount('privacyRestrictedUsers', Array.from(window.privacyRestrictedUsers).map(id => String(id)));
                    Storage.flush();
                    
                    window.currentOpportunities = (window.currentOpportunities || []).filter(
                        opp => String(opp.targetUserId) !== String(userId)
                    );
                    window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                        opp => String(opp.targetUserId) !== String(userId)
                    );
                    
                    if (onStatusUpdate) {
                        onStatusUpdate(3, 3, `Privacy settings prevent trading with ${username}`, 'error');
                    }
                    return { success: false, reason: 'privacy_restricted', privacyRestricted: true };
                }
            }

            if (tradeResult && tradeResult.tradeId) {
                if (onStatusUpdate) {
                    onStatusUpdate(3, 3, `Trade sent successfully to ${username}`, 'success');
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

                fetchUsernameCached(userId).then(async username => {
                    const tradeRecord = {
                        ...baseTradeRecord,
                        user: username
                    };
                    await saveTradeToPending(tradeRecord);
                });

                const sentTradeKey = `${String(tradeId)}-${String(userId)}`;
                if (!window.sentTrades) {
                    const stored = Storage.getAccount('sentTrades', []);
                    window.sentTrades = new Set(stored.map(key => String(key)));
                }
                if (!window.sentTrades.has(sentTradeKey)) {
                    window.sentTrades.add(sentTradeKey);
                    Storage.setAccount('sentTrades', Array.from(window.sentTrades).map(key => String(key)));
                    Storage.flush();
                }

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

                const isSendingAllTrades = window.SendAllTrades && typeof window.SendAllTrades.isSendingAllTrades === 'function' && window.SendAllTrades.isSendingAllTrades();
                
                if (!isSendingAllTrades) {
                    if (storedTrade) {
                        const maxTrades = storedTrade.settings?.maxTrades || 5;
                        if (newCount >= maxTrades) {
                            window.currentOpportunities = (window.currentOpportunities || []).filter(
                                opp => String(opp.id) !== String(tradeId)
                            );
                            window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                                opp => String(opp.id) !== String(tradeId)
                            );
                        } else {
                            window.currentOpportunities = (window.currentOpportunities || []).filter(
                                opp => !(String(opp.id) === String(tradeId) && String(opp.targetUserId) === String(userId))
                            );
                            window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                                opp => !(String(opp.id) === String(tradeId) && String(opp.targetUserId) === String(userId))
                            );
                        }
                    } else {
                        window.currentOpportunities = (window.currentOpportunities || []).filter(
                            opp => !(String(opp.id) === String(tradeId) && String(opp.targetUserId) === String(userId))
                        );
                        window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                            opp => !(String(opp.id) === String(tradeId) && String(opp.targetUserId) === String(userId))
                        );
                    }
                    
                    if (window.Pagination) {
                        window.Pagination.setCurrentPage(1);
                        window.Pagination.displayCurrentPage();
                    }
                    if (window.updateTotalUsersInfo) {
                        window.updateTotalUsersInfo();
                    }
                    if (window.updateTradeFilterBar) {
                        window.updateTradeFilterBar();
                    }
                }

                return { success: true, tradeId: tradeResult.tradeId, opportunity };
            }
            
            if (onStatusUpdate) {
                onStatusUpdate(3, 3, `No trade ID returned for ${username}`, 'error');
            }
            return { success: false, reason: 'no_trade_id', error: null };
        } catch (error) {
            if (window.SendAllChallengeHandler && window.SendAllChallengeHandler.isChallengeError(error)) {
                if (onStatusUpdate) {
                    onStatusUpdate(3, 3, `2FA challenge required for ${username}`, 'warning');
                }
                return { success: false, reason: 'challenge_required', error };
            }
            
            const errorMessage = error?.message || error?.error || String(error);
            const hasPrivacyError = errorMessage.includes('privacy') || 
                                   (error?.errors && Array.isArray(error.errors) && error.errors.some(e => e.code === 22));
            
            if (hasPrivacyError) {
                if (!window.privacyRestrictedUsers) {
                    const stored = Storage.getAccount('privacyRestrictedUsers', []);
                    window.privacyRestrictedUsers = new Set(stored.map(id => String(id)));
                }
                window.privacyRestrictedUsers.add(String(userId));
                Storage.setAccount('privacyRestrictedUsers', Array.from(window.privacyRestrictedUsers).map(id => String(id)));
                Storage.flush();
                
                window.currentOpportunities = (window.currentOpportunities || []).filter(
                    opp => String(opp.targetUserId) !== String(userId)
                );
                window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                    opp => String(opp.targetUserId) !== String(userId)
                );
                
                if (onStatusUpdate) {
                    onStatusUpdate(3, 3, `Privacy settings prevent trading with ${username}`, 'error');
                }
                return { success: false, reason: 'privacy_restricted', privacyRestricted: true };
            }
            
            if (onStatusUpdate) {
                onStatusUpdate(3, 3, `Failed to send trade to ${username}: ${errorMessage}`, 'error');
            }
            return { success: false, reason: 'send_failed', error };
        }
    }

    window.SendAllTradeSender = {
        sendSingleTrade: sendSingleTrade
    };

})();
