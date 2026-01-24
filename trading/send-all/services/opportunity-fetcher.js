(function() {
    'use strict';

    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;

    async function fetchNewOpportunitiesForTrade(tradeId, neededCount, shouldStopCheck = () => false) {
        if (shouldStopCheck()) return [];
        
        try {
            const autoTrades = Storage.getAccount('autoTrades', []);
            const trade = autoTrades.find(t => String(t.id) === String(tradeId));
            if (!trade) return [];

            const rolimonData = window.rolimonData || {};
            if (Object.keys(rolimonData).length === 0) {
                try {
                    const response = await chrome.runtime.sendMessage({ action: 'fetchRolimons' });
                    if (response?.success) {
                        Object.assign(rolimonData, response.data.items || {});
                        window.rolimonData = rolimonData;
                    }
                } catch (error) {
                    if (window.handleExpectedError) {
                        window.handleExpectedError(error, {
                            module: 'OpportunityFetcher',
                            action: 'fetchRolimons',
                            severity: window.ERROR_SEVERITY?.LOW || 'low'
                        });
                    }
                    return [];
                }
            }

            const itemIds = [];
            let rolimonLookup = null;
            if (Object.keys(rolimonData).length > 0) {
                rolimonLookup = new Map();
                for (const [itemId, itemData] of Object.entries(rolimonData)) {
                    if (Array.isArray(itemData) && itemData.length >= 5) {
                        const rolimonName = (itemData[0] || '').trim().toLowerCase();
                        if (rolimonName) {
                            rolimonLookup.set(rolimonName, parseInt(itemId) || 0);
                        }
                    }
                }
            }

            for (const item of trade.receiving || []) {
                let itemId = item.id || item.itemId;
                if (!itemId && item.name && rolimonLookup) {
                    const itemName = (item.name || '').trim().toLowerCase();
                    itemId = rolimonLookup.get(itemName) || null;
                }
                if (itemId && !isNaN(itemId) && itemId > 0) {
                    itemIds.push(itemId);
                }
            }

            if (itemIds.length === 0) return [];

            const settings = Trades.getSettings();
            let response;
            try {
                response = await chrome.runtime.sendMessage({
                    action: 'fetchCommonOwners',
                    itemIds: itemIds,
                    maxOwnerDays: settings.maxOwnerDays,
                    lastOnlineDays: settings.lastOnlineDays
                });
            } catch (error) {
                if (window.handleExpectedError) {
                    window.handleExpectedError(error, {
                        module: 'OpportunityFetcher',
                        action: 'fetchCommonOwners',
                        severity: window.ERROR_SEVERITY?.LOW || 'low'
                    });
                }
                return [];
            }

            if (!response?.success || !response?.data?.owners) {
                return [];
            }

            const realOwners = response.data.owners;
            let userIds = [];
            
            if (realOwners.length > 0 && Array.isArray(realOwners[0]) && realOwners[0].length >= 3) {
                if (!window.ownersRawData) window.ownersRawData = {};
                window.ownersRawData[trade.id] = realOwners.map(o => ({
                    userId: o[0],
                    ownedSince: o[1],
                    lastOnline: o[2]
                }));
                userIds = realOwners.map(o => o[0]);
            } else {
                userIds = realOwners;
            }

            if (!window.tradeRealOwners) window.tradeRealOwners = {};
            window.tradeRealOwners[trade.id] = userIds;

            const yourIds = window.getItemIdsFromTrade ? await window.getItemIdsFromTrade(trade.giving, rolimonData) : [];
            const theirIds = window.getItemIdsFromTrade ? await window.getItemIdsFromTrade(trade.receiving, rolimonData) : [];
            const yourR = trade.robuxGive || 0;
            const theirR = trade.robuxGet || 0;

            const oldSentTrades = new Set(Storage.getAccount('sentTrades', []));
            const history = Trades.getSentTradeHistory();
            const now = Date.now();
            const expiryMs = settings.tradeMemoryDays * 24 * 60 * 60 * 1000;
            const validHistory = history.filter(entry => (now - entry.timestamp) < expiryMs);

            const freshOwners = [];
            for (const userId of userIds) {
                if (shouldStopCheck()) break;
                
                const tradeKey = `${String(trade.id)}-${String(userId)}`;
                const isOldDuplicate = oldSentTrades.has(tradeKey);
                const isHashDuplicate = await Trades.isTradeComboSentRecently(userId, yourIds, theirIds, yourR, theirR);
                
                if (!isOldDuplicate && !isHashDuplicate) {
                    freshOwners.push(userId);
                }
            }

            const shuffledFreshOwners = [...freshOwners].sort(() => Math.random() - 0.5);
            const ownersToUse = shuffledFreshOwners.slice(0, neededCount);
            
            let newOpportunities = ownersToUse.map((userId, index) => {
                const tradeKey = `${trade.id}-${userId}`;
                return {
                    ...trade,
                    targetUserId: userId,
                    targetUser: {
                        id: userId,
                        username: `Loading...`,
                        displayName: `User${userId}`,
                        avatarUrl: ``
                    },
                    tradeKey: tradeKey,
                    status: 'available',
                    opportunityIndex: index + 1,
                    itemIds: itemIds
                };
            });

            if (newOpportunities.length > 0 && window.fetchRealUsernames) {
                try {
                    newOpportunities = await window.fetchRealUsernames(newOpportunities);
                } catch (error) {
                    if (window.handleExpectedError) {
                        window.handleExpectedError(error, {
                            module: 'OpportunityFetcher',
                            action: 'fetchRealUsernames',
                            severity: window.ERROR_SEVERITY?.LOW || 'low'
                        });
                    }
                }
            }

            return newOpportunities;
        } catch (error) {
            if (window.handleUnexpectedError) {
                window.handleUnexpectedError(error, {
                    module: 'OpportunityFetcher',
                    action: 'fetchNewOpportunitiesForTrade',
                    severity: window.ERROR_SEVERITY?.HIGH || 'high'
                });
            }
            return [];
        }
    }

    window.OpportunityFetcher = {
        fetchNewOpportunitiesForTrade
    };
})();
