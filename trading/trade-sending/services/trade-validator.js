(function() {
    'use strict';

    async function validateTradeCanBeSent(userId) {
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
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }

            if (!canTradeResponse || !canTradeResponse.success) {
                return { canTrade: true, skipCheck: true };
            }

            const canTradeData = canTradeResponse.data;

            if (!canTradeData) {
                return { canTrade: true, skipCheck: true };
            }

            if (canTradeData.canTrade === false) {
                const statusMessages = {
                    'CannotTrade': 'This user cannot trade',
                    'UnknownUser': 'User not found',
                    'InsufficientMembership': 'User needs premium membership',
                    'UserBlocked': 'You are blocked by this user',
                    'UserPrivacySettingsTooRestrictive': 'User\'s privacy settings prevent trading'
                };

                const friendlyMessage = statusMessages[canTradeData.status] || canTradeData.status || 'Cannot trade with this user';

                return {
                    canTrade: false,
                    message: friendlyMessage,
                    status: canTradeData.status
                };
            }

            return { canTrade: true };
        } catch (error) {
            if (window.handleUnexpectedError) {
                window.handleUnexpectedError(error, {
                    module: 'TradeValidator',
                    action: 'validateTradeCanBeSent',
                    severity: window.ERROR_SEVERITY?.MEDIUM || 'medium'
                });
            }
            return { canTrade: true, skipCheck: true };
        }
    }

    async function validateTradeItems(opportunity) {
        try {
            const currentUserId = Inventory.getCurrentUserId() || await Inventory.getCurrentUserIdAsync();

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

            return {
                valid: true,
                currentUserId,
                ourItemIds,
                theirItemIds
            };
        } catch (error) {
            if (window.handleUnexpectedError) {
                window.handleUnexpectedError(error, {
                    module: 'TradeValidator',
                    action: 'validateTradeItems',
                    severity: window.ERROR_SEVERITY?.HIGH || 'high'
                });
            }
            throw error;
        }
    }

    async function validateInstanceIds(instanceResponse, ourItemIds, theirItemIds, currentUserId, targetUserId) {
        try {
            if (!instanceResponse.success || !instanceResponse.data.trade) {
                throw new Error(instanceResponse.error || 'Failed to get instance IDs');
            }

            const tradeData = instanceResponse.data.trade;
            const ourTradeData = tradeData.find(t => t.user_id === currentUserId);
            const theirTradeData = tradeData.find(t => t.user_id === targetUserId);

            const ourInstanceIds = (ourTradeData?.item_instance_ids || []).slice(0, ourItemIds.length);
            const theirInstanceIds = (theirTradeData?.item_instance_ids || []).slice(0, theirItemIds.length);

            if (ourInstanceIds.length !== ourItemIds.length) {
                throw new Error(`Missing instance IDs for giving items. Expected ${ourItemIds.length}, got ${ourInstanceIds.length}`);
            }
            if (theirInstanceIds.length !== theirItemIds.length) {
                throw new Error(`Missing instance IDs for receiving items. Expected ${theirItemIds.length}, got ${theirInstanceIds.length}`);
            }

            return {
                valid: true,
                ourInstanceIds,
                theirInstanceIds
            };
        } catch (error) {
            if (window.handleUnexpectedError) {
                window.handleUnexpectedError(error, {
                    module: 'TradeValidator',
                    action: 'validateInstanceIds',
                    severity: window.ERROR_SEVERITY?.HIGH || 'high'
                });
            }
            throw error;
        }
    }

    window.TradeValidator = {
        validateTradeCanBeSent,
        validateTradeItems,
        validateInstanceIds
    };
})();
