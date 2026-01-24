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

    const TradeValidator = window.TradeValidator || {};
    const TradeStorage = window.TradeStorage || {};

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

                e.target.textContent = 'Sending Trade...';

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
                    const currentUserId = Inventory.getCurrentUserId() || await Inventory.getCurrentUserIdAsync();
                    if (!currentUserId) {
                        throw new Error('Could not get current user ID');
                    }

                    const ourItemIds = await Opportunities.getItemIdsFromTrade(opportunity.giving, window.rolimonData || {});
                    const theirItemIds = await Opportunities.getItemIdsFromTrade(opportunity.receiving, window.rolimonData || {});

                    if (ourItemIds.length !== opportunity.giving.length || theirItemIds.length !== opportunity.receiving.length) {
                        throw new Error('Missing item IDs');
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

                    if (!instanceResponse.success || !instanceResponse.data || !instanceResponse.data.participants) {
                        throw new Error('Failed to fetch instance IDs');
                    }

                    const participants = instanceResponse.data.participants;
                    const ourData = participants[String(currentUserId)];
                    const theirData = participants[String(userId)];

                    if (!ourData || !theirData || !ourData.instanceIds || !theirData.instanceIds) {
                        throw new Error('Missing instance IDs');
                    }

                    const ourInstanceIds = ourData.instanceIds.slice(0, ourItemIds.length);
                    const theirInstanceIds = theirData.instanceIds.slice(0, theirItemIds.length);

                    if (ourInstanceIds.length !== ourItemIds.length || theirInstanceIds.length !== theirItemIds.length) {
                        throw new Error('Instance count mismatch');
                    }

                    btn.textContent = 'SENDING TRADE...';
                    btn.style.background = '#17a2b8';

                    try {
                        let tradeResult = null;
                        let useAutoConfirmer = false;

                        if (window.AutoConfirmer) {
                            const autoConfirmerResult = await window.AutoConfirmer.sendTradeWithAutoConfirmer(
                                opportunity,
                                currentUserId,
                                ourInstanceIds,
                                theirInstanceIds,
                                null
                            );

                            if (autoConfirmerResult.success) {
                                tradeResult = { tradeId: autoConfirmerResult.tradeId };
                                useAutoConfirmer = true;
                            } else if (!autoConfirmerResult.useFallback) {
                                e.target.dataset.trading = 'false';
                                e.target.textContent = 'Cannot Trade';
                                e.target.style.background = '#6c757d';
                                e.target.style.color = '#fff';
                                e.target.disabled = true;
                                return;
                            }
                        }

                        if (!tradeResult) {
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
                                tradeResult = await BridgeUtils.callBridgeMethod('sendTrade', angularTradeData);
                            } catch (bridgeError) {
                                if (window.SendAllChallengeHandler && window.SendAllChallengeHandler.isChallengeError(bridgeError)) {
                                    e.target.dataset.trading = 'false';
                                    e.target.textContent = '2FA Required';
                                    e.target.style.background = '#ffc107';
                                    e.target.style.color = '#000';
                                    e.target.disabled = false;
                                    return;
                                }
                                
                                const errorMessage = bridgeError?.message || bridgeError?.error || String(bridgeError);
                                const hasPrivacyError = errorMessage.includes('privacy') || 
                                                       (bridgeError?.errors && Array.isArray(bridgeError.errors) && bridgeError.errors.some(e => e.code === 22));
                                
                                if (hasPrivacyError) {
                                    if (!window.privacyRestrictedUsers) {
                                        const stored = window.Storage?.getAccount('privacyRestrictedUsers', []) || [];
                                        window.privacyRestrictedUsers = new Set(stored.map(id => String(id)));
                                    }
                                    window.privacyRestrictedUsers.add(String(userId));
                                    if (window.Storage) {
                                        window.Storage.setAccount('privacyRestrictedUsers', Array.from(window.privacyRestrictedUsers).map(id => String(id)));
                                    }
                                    
                                    window.currentOpportunities = (window.currentOpportunities || []).filter(
                                        opp => String(opp.targetUserId) !== String(userId)
                                    );
                                    window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                                        opp => String(opp.targetUserId) !== String(userId)
                                    );
                                    
                                    Opportunities.updateTradeFilterBar();
                                    Opportunities.updateTotalUsersInfo();
                                }
                                
                                e.target.dataset.trading = 'false';
                                e.target.textContent = 'Cannot Trade';
                                e.target.style.background = '#6c757d';
                                e.target.style.color = '#fff';
                                e.target.disabled = true;
                                return;
                            }
                        }

                        if (tradeResult && tradeResult.errors) {
                            const hasPrivacyError = tradeResult.errors.some(e => e.code === 22);
                            if (hasPrivacyError) {
                                if (!window.privacyRestrictedUsers) {
                                    const stored = window.Storage?.getAccount('privacyRestrictedUsers', []) || [];
                                    window.privacyRestrictedUsers = new Set(stored.map(id => String(id)));
                                }
                                window.privacyRestrictedUsers.add(String(userId));
                                if (window.Storage) {
                                    window.Storage.setAccount('privacyRestrictedUsers', Array.from(window.privacyRestrictedUsers).map(id => String(id)));
                                }
                                
                                window.currentOpportunities = (window.currentOpportunities || []).filter(
                                    opp => String(opp.targetUserId) !== String(userId)
                                );
                                window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                                    opp => String(opp.targetUserId) !== String(userId)
                                );
                                
                                Opportunities.updateTradeFilterBar();
                                Opportunities.updateTotalUsersInfo();
                                
                                e.target.dataset.trading = 'false';
                                e.target.textContent = 'Cannot Trade';
                                e.target.style.background = '#6c757d';
                                e.target.style.color = '#fff';
                                e.target.disabled = true;
                                return;
                            }
                        }

                        if (tradeResult && tradeResult.tradeId) {
                            if (TradeStorage && TradeStorage.saveTradeAfterSending) {
                                await TradeStorage.saveTradeAfterSending(tradeResult, opportunity, tradeId, userId);
                            } else if (window.TradeStorage && window.TradeStorage.saveTradeAfterSending) {
                                await window.TradeStorage.saveTradeAfterSending(tradeResult, opportunity, tradeId, userId);
                            }
                            if (TradeStorage && TradeStorage.refreshOutboundTrades) {
                                TradeStorage.refreshOutboundTrades();
                            } else if (window.TradeStorage && window.TradeStorage.refreshOutboundTrades) {
                                window.TradeStorage.refreshOutboundTrades();
                            }

                            window.currentOpportunities = window.currentOpportunities.filter(
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
                        } else {
                            e.target.dataset.trading = 'false';
                            e.target.textContent = 'Cannot Trade';
                            e.target.style.background = '#6c757d';
                            e.target.style.color = '#fff';
                            e.target.disabled = true;
                        }
                    } catch (robloxError) {
                        e.target.dataset.trading = 'false';
                        e.target.textContent = 'Cannot Trade';
                        e.target.style.background = '#6c757d';
                        e.target.style.color = '#fff';
                        e.target.disabled = true;
                        return;
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
