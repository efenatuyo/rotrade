(function() {
    'use strict';

    async function loadTradeOpportunities() {
        const autoTrades = Storage.get('autoTrades', []);

        if (!window.tradeUserPools) {
            window.tradeUserPools = {};
            window.sentTrades = new Set(Storage.get('sentTrades', []));
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

        const updatedAutoTrades = autoTrades.map(trade => {
            const updatedGiving = trade.giving.map(item => {
                const itemName = (item.name || '').trim();
                if (!itemName) return item;
                
                const rolimonItem = Object.values(rolimonData).find(r => {
                    if (!Array.isArray(r) || r.length < 5) return false;
                    const rolimonName = (r[0] || '').trim();
                    return rolimonName.toLowerCase() === itemName.toLowerCase();
                });

                if (rolimonItem) {
                    const rolimonEntry = Object.entries(rolimonData).find(([id, data]) => data === rolimonItem);
                    const itemId = rolimonEntry ? parseInt(rolimonEntry[0]) : null;
                    
                    return {
                        ...item,
                        id: itemId || item.id || item.itemId,
                        itemId: itemId || item.id || item.itemId,
                        rap: item.rap || rolimonItem[2],
                        value: item.value || rolimonItem[4]
                    };
                }
                return item;
            });

            const updatedReceiving = trade.receiving.map(item => {
                const itemName = (item.name || '').trim();
                if (!itemName) return item;
                
                const rolimonItem = Object.values(rolimonData).find(r => {
                    if (!Array.isArray(r) || r.length < 5) return false;
                    const rolimonName = (r[0] || '').trim();
                    return rolimonName.toLowerCase() === itemName.toLowerCase();
                });

                if (rolimonItem) {
                    const rolimonEntry = Object.entries(rolimonData).find(([id, data]) => data === rolimonItem);
                    const itemId = rolimonEntry ? parseInt(rolimonEntry[0]) : null;
                    
                    return {
                        ...item,
                        id: itemId || item.id || item.itemId,
                        itemId: itemId || item.id || item.itemId,
                        rap: item.rap || rolimonItem[2],
                        value: item.value || rolimonItem[4]
                    };
                }
                return item;
            });

            return {
                ...trade,
                giving: updatedGiving,
                receiving: updatedReceiving
            };
        });

        let opportunities = [];

        if (!window.ownersRawData) window.ownersRawData = {};

        const tradesToLoad = [];
        for (const trade of updatedAutoTrades) {
            let itemIds = [];
            
            trade.receiving.forEach(item => {
                let itemId = item.id || item.itemId;
                
                if (!itemId && item.name && Object.keys(rolimonData).length > 0) {
                    const itemName = (item.name || '').trim();
                    const rolimonEntry = Object.entries(rolimonData).find(([id, data]) => {
                        if (!Array.isArray(data) || data.length < 5) return false;
                        const rolimonName = (data[0] || '').trim();
                        return rolimonName.toLowerCase() === itemName.toLowerCase();
                    });

                    if (rolimonEntry) {
                        itemId = parseInt(rolimonEntry[0]);
                    }
                }
                
                if (itemId && !isNaN(itemId) && itemId > 0) {
                    itemIds.push(itemId);
                }
            });

            if (itemIds.length > 0) {
                tradesToLoad.push({ trade, itemIds });
            }
        }

 
        const settings = Trades.getSettings();
        const ownerPromises = tradesToLoad.map(({ trade, itemIds }) => {
            return chrome.runtime.sendMessage({
                action: 'fetchCommonOwners',
                itemIds: itemIds,
                maxOwnerDays: settings.maxOwnerDays,
                lastOnlineDays: settings.lastOnlineDays
            }).then(response => ({ trade, itemIds, response }));
        });

        const processTradeResponse = async ({ trade, itemIds, response }) => {
            try {
                if (response.success && response.data && response.data.owners) {
                    const realOwners = response.data.owners;

                    trade.totalOwners = realOwners.length;

                    if (!window.tradeRealOwners) window.tradeRealOwners = {};
                    
                    let userIds = [];
                    
                    if (realOwners.length > 0 && Array.isArray(realOwners[0]) && realOwners[0].length >= 3) {
                        window.ownersRawData[trade.id] = realOwners.map(o => ({
                            userId: o[0],
                            ownedSince: o[1],
                            lastOnline: o[2]
                        }));

                        userIds = realOwners.map(o => o[0]);
                    } else {
                        userIds = realOwners;
                        if (window.ownersRawData[trade.id]) delete window.ownersRawData[trade.id];
                    }

                    window.tradeRealOwners[trade.id] = userIds;

                    const autoTrades = Storage.get('autoTrades', []);
                    const storedTrade = autoTrades.find(at => at.id === trade.id);
                    if (storedTrade) {
                        storedTrade.totalOwners = userIds.length;
                        Storage.set('autoTrades', autoTrades);
                    }

                    const maxTrades = trade.settings?.maxTrades || trade.settings?.maxTradesPerDay || 5;
                    const tradesExecutedToday = Trades.getTodayTradeCount(trade.id);
                    const remainingTrades = maxTrades - tradesExecutedToday;

                    if (remainingTrades > 0) {
                        const yourIds = window.getItemIdsFromTrade ? await window.getItemIdsFromTrade(trade.giving, rolimonData) : [];
                        const theirIds = window.getItemIdsFromTrade ? await window.getItemIdsFromTrade(trade.receiving, rolimonData) : [];
                        const yourR = trade.robuxGive || 0;
                        const theirR = trade.robuxGet || 0;

                        const freshOwners = [];

                        for (const userId of userIds) {
                            const tradeKey = `${trade.id}-${userId}`;
                            const isOldDuplicate = window.sentTrades.has(tradeKey);
                            const isHashDuplicate = await Trades.isTradeComboSentRecently(userId, yourIds, theirIds, yourR, theirR);
                            
                            if (!isOldDuplicate && !isHashDuplicate) {
                                freshOwners.push(userId);
                            }
                        }

                        const ownersToShow = freshOwners.slice(0, remainingTrades);

                        const newOpportunities = ownersToShow.map((userId, index) => {
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

                        opportunities.push(...newOpportunities);

                        if (!window._lastOpportunityUpdate || Date.now() - window._lastOpportunityUpdate > 500) {
                            window._lastOpportunityUpdate = Date.now();
                            
                            if (window.location.pathname.includes('/trades') || window.location.pathname.includes('/auto-trades')) {
                                function shuffleArray(array) {
                                    const shuffled = [...array];
                                    for (let i = shuffled.length - 1; i > 0; i--) {
                                        const j = Math.floor(Math.random() * (i + 1));
                                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                                    }
                                    return shuffled;
                                }

                                const shuffled = shuffleArray(opportunities);
                                window.currentOpportunities = shuffled;
                                window.filteredOpportunities = [...shuffled];
                                
                                if (window.updateTradeFilterBar) window.updateTradeFilterBar();
                                Pagination.setCurrentPage(1);
                                Pagination.displayCurrentPage();
                                if (window.updateTotalUsersInfo) window.updateTotalUsersInfo();
                            }
                        }
                    }
                }
            } catch (error) {
            }
        };

        const results = await Promise.allSettled(ownerPromises.map(promise => 
            promise.then(processTradeResponse).catch(() => {})
        ));

        function shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }

        opportunities = shuffleArray(opportunities);

        opportunities = window.fetchRealUsernames ? await window.fetchRealUsernames(opportunities) : opportunities;

        window.currentOpportunities = opportunities;
        window.filteredOpportunities = [...opportunities];
        window.rolimonData = rolimonData;

        if (window.updateTradeFilterBar) window.updateTradeFilterBar();
        Pagination.setCurrentPage(1);
        Pagination.displayCurrentPage();
        if (window.updateTotalUsersInfo) window.updateTotalUsersInfo();

        Utils.delay(200).then(() => {
            if (window.loadUserAvatars) window.loadUserAvatars();
        });
    }

    window.OpportunitiesLoader = {
        loadTradeOpportunities
    };

    window.loadTradeOpportunities = loadTradeOpportunities;

})();