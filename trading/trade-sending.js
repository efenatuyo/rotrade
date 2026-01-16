(function() {
    'use strict';

    function copyChallengeToPrimaryPage(iframe, buttonElement) {
        showOriginalRobloxInterface(buttonElement);
    }

    function showOriginalRobloxInterface(buttonElement) {
        const contentContainer = document.querySelector('#content');
        const customOverlay = document.querySelector('#custom-send-trades-overlay');

        if (contentContainer && customOverlay) {
            Array.from(contentContainer.children).forEach(child => {
                if (child.id !== 'custom-send-trades-overlay') {
                    child.style.visibility = 'visible';
                }
            });
            customOverlay.style.visibility = 'hidden';

            if (buttonElement) {
                buttonElement.textContent = 'Complete challenge on Roblox page';
                buttonElement.style.background = '#ff6b35';
            }
        }
    }

    function saveTradeToPending(tradeRecord) {
        const pendingTrades = Storage.get('pendingExtensionTrades', []);
        // Check if trade already exists to avoid duplicates
        const exists = pendingTrades.some(t => t.id === tradeRecord.id);
        if (!exists) {
            pendingTrades.push(tradeRecord);
            Storage.set('pendingExtensionTrades', pendingTrades);
            Storage.flush(); // Ensure it's written immediately
            
            // If on auto-trades page, refresh outbound trades
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
    }

    function setupSendTradeButtons() {
        document.querySelectorAll('.send-trade-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = parseInt(e.target.getAttribute('data-user-id'));
                const tradeId = e.target.getAttribute('data-trade-id');

                if (e.target.dataset.trading === 'true') {
                    return;
                }

                e.target.dataset.trading = 'true';
                e.target.textContent = 'Checking if tradable...';
                e.target.style.background = '#ffc107';
                e.target.disabled = true;

                try {
                    let canTradeResponse = null;
                    let attempts = 0;
                    const maxAttempts = 2;

                    while (attempts < maxAttempts && !canTradeResponse?.success) {
                        attempts++;

                        try {
                            canTradeResponse = await chrome.runtime.sendMessage({
                                action: 'checkCanTradeWith',
                                userId: userId
                            });

                            if (canTradeResponse?.success) {
                                break;
                            }
                        } catch (attemptError) {
                            if (attempts < maxAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }
                        }
                    }

                    if (!canTradeResponse?.success) {
                        e.target.textContent = 'Sending Trade...';
                    } else {
                        const canTradeData = canTradeResponse.data;

                        if (!canTradeData.canTrade) {
                            e.target.textContent = 'Cannot Trade';
                            e.target.style.background = '#dc3545';
                            e.target.style.color = '#fff';
                            e.target.disabled = true;
                            e.target.dataset.trading = 'false';

                            const statusMessages = {
                                'CannotTrade': 'This user cannot trade',
                                'UnknownUser': 'User not found',
                                'InsufficientMembership': 'User needs premium membership',
                                'UserBlocked': 'You are blocked by this user',
                                'UserPrivacySettingsTooRestrictive': 'User\'s privacy settings prevent trading'
                            };

                            const friendlyMessage = statusMessages[canTradeData.status] || canTradeData.status || 'Cannot trade with this user';

                            return;
                        }

                        e.target.textContent = 'Sending Trade...';
                    }
                } catch (outerError) {
                }

                const opportunity = window.currentOpportunities.find(
                    opp => opp.id == tradeId && opp.targetUserId == userId
                );

                if (!opportunity) {
                    e.target.textContent = 'Trade Not Found';
                    e.target.style.background = '#dc3545';
                    e.target.disabled = true;
                    e.target.dataset.trading = 'false';
                    return;
                }

                e.target.textContent = 'GETTING INSTANCE IDs...';
                e.target.disabled = true;
                e.target.style.background = '#ffc107';

                try {
                    const currentUserId = await Inventory.getCurrentUserId();

                    if (!currentUserId) {
                        throw new Error('Could not get current user ID');
                    }

                    const ourItemIds = await Opportunities.getItemIdsFromTrade(opportunity.giving, window.rolimonData || {});
                    const theirItemIds = await Opportunities.getItemIdsFromTrade(opportunity.receiving, window.rolimonData || {});

                    if (ourItemIds.length !== opportunity.giving.length) {
                        throw new Error(`Missing item IDs for giving items. Expected ${opportunity.giving.length}, got ${ourItemIds.length}`);
                    }
                    if (theirItemIds.length !== opportunity.receiving.length) {
                        throw new Error(`Missing item IDs for receiving items. Expected ${opportunity.receiving.length}, got ${theirItemIds.length}`);
                    }

                    const tradePayload = {
                        trade: [
                            {
                                user_id: currentUserId,
                                item_ids: ourItemIds,
                                robux: opportunity.giving.reduce((sum, item) => sum + (item.robux || 0), 0)
                            },
                            {
                                user_id: userId,
                                item_ids: theirItemIds,
                                robux: opportunity.receiving.reduce((sum, item) => sum + (item.robux || 0), 0)
                            }
                        ]
                    };

                    const instanceResponse = await chrome.runtime.sendMessage({
                        action: 'fetchInstanceIds',
                        payload: tradePayload
                    });

                    if (instanceResponse.success && instanceResponse.data.trade) {
                        const tradeData = instanceResponse.data.trade;

                        const currentUserId = await Inventory.getCurrentUserId();

                        const ourTradeData = tradeData.find(t => t.user_id === currentUserId);
                        const theirTradeData = tradeData.find(t => t.user_id === userId);

                        const ourInstanceIds = (ourTradeData?.item_instance_ids || []).slice(0, ourItemIds.length);
                        const theirInstanceIds = (theirTradeData?.item_instance_ids || []).slice(0, theirItemIds.length);

                        if (ourInstanceIds.length !== ourItemIds.length) {
                            throw new Error(`Missing instance IDs for giving items. Expected ${ourItemIds.length}, got ${ourInstanceIds.length}`);
                        }
                        if (theirInstanceIds.length !== theirItemIds.length) {
                            throw new Error(`Missing instance IDs for receiving items. Expected ${theirItemIds.length}, got ${theirInstanceIds.length}`);
                        }

                        btn.textContent = 'SENDING TRADE...';
                        btn.style.background = '#17a2b8';

                        try {

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
                                const tradeResult = await BridgeUtils.callBridgeMethod('sendTrade', angularTradeData);

                                if (tradeResult && tradeResult.tradeId) {
                                    const yourIds = await Opportunities.getItemIdsFromTrade(opportunity.giving, window.rolimonData || {});
                                    const theirIds = await Opportunities.getItemIdsFromTrade(opportunity.receiving, window.rolimonData || {});
                                    const yourR = opportunity.robuxGive || 0;
                                    const theirR = opportunity.robuxGet || 0;

                                    Trades.logSentTradeCombo(userId, yourIds, theirIds, yourR, theirR);

                                    // Create base trade record
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

                                    // Try to get user data, but save trade immediately regardless
                                    fetch(`https://users.roblox.com/v1/users/${userId}`)
                                        .then(response => {
                                            return response.json();
                                        })
                                        .then(userData => {
                                            const tradeRecord = {
                                                ...baseTradeRecord,
                                                user: userData.name || userData.displayName || `User ${userId}`
                                            };
                                            saveTradeToPending(tradeRecord);
                                        })
                                        .catch(error => {
                                            // Save trade even if user fetch fails
                                            const tradeRecord = {
                                                ...baseTradeRecord,
                                                user: `User ${userId}`
                                            };
                                            saveTradeToPending(tradeRecord);
                                        });
                                }

                                const sentTradeKey = `${tradeId}-${userId}`;
                                window.sentTrades.add(sentTradeKey);

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

                                Storage.set('sentTrades', [...window.sentTrades]);

                                window.currentOpportunities = window.currentOpportunities.filter(
                                    opp => !(opp.id == tradeId && opp.targetUserId == userId)
                                );
                                window.filteredOpportunities = window.filteredOpportunities.filter(
                                    opp => !(opp.id == tradeId && opp.targetUserId == userId)
                                );

                                window.filteredOpportunities = window.filteredOpportunities.filter(
                                    opp => !(opp.id == tradeId && opp.targetUserId == userId)
                                );

                                Opportunities.updateTradeFilterBar();
                                Opportunities.updateTotalUsersInfo();

                                e.target.textContent = 'TRADE SENT!';
                                e.target.style.background = '#28a745';
                                e.target.disabled = true;

                            } catch (bridgeError) {
                                e.target.dataset.trading = 'false';
                                e.target.textContent = 'Cannot Trade';
                                e.target.style.background = '#6c757d';
                                e.target.style.color = '#fff';
                                e.target.disabled = true;

                                return;
                            }
                        } catch (robloxError) {
                            e.target.dataset.trading = 'false';
                            e.target.textContent = 'Cannot Trade';
                            e.target.style.background = '#6c757d';
                            e.target.style.color = '#fff';
                            e.target.disabled = true;

                            return;
                        }
                    } else {
                        throw new Error(instanceResponse.error || 'Failed to get instance IDs');
                    }
                } catch (error) {
                    e.target.dataset.trading = 'false';
                    e.target.textContent = 'Cannot Trade';
                    e.target.style.background = '#6c757d';
                    e.target.style.color = '#fff';
                    e.target.disabled = true;
                }
            });
        });
    }

    window.TradeSending = {
        setupSendTradeButtons,
        copyChallengeToPrimaryPage,
        showOriginalRobloxInterface
    };

    window.setupSendTradeButtons = setupSendTradeButtons;
    window.copyChallengeToPrimaryPage = copyChallengeToPrimaryPage;
    window.showOriginalRobloxInterface = showOriginalRobloxInterface;
})();
