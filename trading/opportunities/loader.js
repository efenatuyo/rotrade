(function() {
    'use strict';

    async function loadTradeOpportunities() {
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
        
        const autoTrades = await Storage.getAccountAsync('autoTrades', []);

        if (!window.tradeUserPools) {
            window.tradeUserPools = {};
        }
        
        const storedSentTrades = await Storage.getAccountAsync('sentTrades', []);
        if (storedSentTrades && Array.isArray(storedSentTrades)) {
            window.sentTrades = new Set(storedSentTrades.map(key => String(key)));
        } else {
            window.sentTrades = new Set();
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
                if (!response || !response.success) {
                    return;
                }
                
                let realOwners = null;
                if (response.data) {
                    if (response.data.owners && Array.isArray(response.data.owners)) {
                        realOwners = response.data.owners;
                    } else if (Array.isArray(response.data)) {
                        realOwners = response.data;
                    }
                }
                
                if (!realOwners || !Array.isArray(realOwners) || realOwners.length === 0) {
                    return;
                }
                

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

                const autoTrades = await Storage.getAccountAsync('autoTrades', []);
                const storedTrade = autoTrades.find(at => at.id === trade.id);
                if (storedTrade) {
                    storedTrade.totalOwners = userIds.length;
                    Storage.setAccount('autoTrades', autoTrades);
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

                    const storedSentTrades = await Storage.getAccountAsync('sentTrades', []);
                    if (storedSentTrades && Array.isArray(storedSentTrades)) {
                        window.sentTrades = new Set(storedSentTrades.map(key => String(key)));
                    } else if (!window.sentTrades) {
                        window.sentTrades = new Set();
                    }

                    const storedPrivacyRestricted = await Storage.getAccountAsync('privacyRestrictedUsers', []);
                    if (storedPrivacyRestricted && Array.isArray(storedPrivacyRestricted)) {
                        window.privacyRestrictedUsers = new Set(storedPrivacyRestricted.map(id => String(id)));
                    } else if (!window.privacyRestrictedUsers) {
                        window.privacyRestrictedUsers = new Set();
                    }

                    for (const userId of userIds) {
                        const tradeKey = `${String(trade.id)}-${String(userId)}`;
                        const isOldDuplicate = window.sentTrades.has(tradeKey);
                        const isHashDuplicate = await Trades.isTradeComboSentRecently(userId, yourIds, theirIds, yourR, theirR);
                        const isPrivacyRestricted = window.privacyRestrictedUsers.has(String(userId));
                        
                        if (!isOldDuplicate && !isHashDuplicate && !isPrivacyRestricted) {
                            freshOwners.push(userId);
                        }
                    }

                    const ownersToShow = freshOwners.slice(0, remainingTrades);
                    

                    const newOpportunities = ownersToShow.map((userId, index) => {
                        const tradeKey = `${String(trade.id)}-${String(userId)}`;
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

                    const isSendingAllTrades = window.SendAllTrades && typeof window.SendAllTrades.isSendingAllTrades === 'function' && window.SendAllTrades.isSendingAllTrades();
                    
                    if (!isSendingAllTrades && (!window._lastOpportunityUpdate || Date.now() - window._lastOpportunityUpdate > 500)) {
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

                            const storedSentTrades = await Storage.getAccountAsync('sentTrades', []);
                            if (storedSentTrades && Array.isArray(storedSentTrades)) {
                                window.sentTrades = new Set(storedSentTrades.map(key => String(key)));
                            } else if (!window.sentTrades) {
                                window.sentTrades = new Set();
                            }

                            const shuffled = shuffleArray(opportunities);
                            window.currentOpportunities = shuffled;
                            
                            let filtered = window.currentOpportunities;
                            
                            filtered = filtered.filter(opp => {
                                if (!opp || !opp.tradeKey) return true;
                                return !window.sentTrades.has(opp.tradeKey);
                            });
                            
                            window.filteredOpportunities = filtered;
                            
                            if (window.updateTradeFilterBar) window.updateTradeFilterBar();
                            Pagination.setCurrentPage(1);
                            Pagination.displayCurrentPage().catch(() => {});
                            if (window.updateTotalUsersInfo) window.updateTotalUsersInfo();
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

        const storedSentTradesFinal = await Storage.getAccountAsync('sentTrades', []);
        if (storedSentTradesFinal && Array.isArray(storedSentTradesFinal)) {
            window.sentTrades = new Set(storedSentTradesFinal.map(key => String(key)));
        } else {
            window.sentTrades = new Set();
        }

        const storedPrivacyRestrictedFinal = await Storage.getAccountAsync('privacyRestrictedUsers', []);
        if (storedPrivacyRestrictedFinal && Array.isArray(storedPrivacyRestrictedFinal)) {
            window.privacyRestrictedUsers = new Set(storedPrivacyRestrictedFinal.map(id => String(id)));
        } else {
            window.privacyRestrictedUsers = new Set();
        }

        opportunities = opportunities.filter(opp => {
            if (!opp || !opp.tradeKey) return true;
            const tradeKey = `${String(opp.id || opp.autoTradeId || '')}-${String(opp.targetUserId || '')}`;
            const isSent = window.sentTrades.has(tradeKey) || window.sentTrades.has(opp.tradeKey);
            const isRestricted = window.privacyRestrictedUsers.has(String(opp.targetUserId));
            return !isSent && !isRestricted;
        });

        const storedSentTradesForFilter = await Storage.getAccountAsync('sentTrades', []);
        if (storedSentTradesForFilter && Array.isArray(storedSentTradesForFilter)) {
            window.sentTrades = new Set(storedSentTradesForFilter.map(key => String(key)));
        } else if (!window.sentTrades) {
            window.sentTrades = new Set();
        }
        
        let filtered = opportunities.filter(opp => {
            if (!opp || !opp.tradeKey) {
                return false;
            }
            const isSent = window.sentTrades.has(opp.tradeKey);
            const isRestricted = window.privacyRestrictedUsers && window.privacyRestrictedUsers.has(String(opp.targetUserId));
            return !isSent && !isRestricted;
        });
        
        filtered = shuffleArray(filtered);

        filtered = window.fetchRealUsernames ? await window.fetchRealUsernames(filtered) : filtered;


        if (!Array.isArray(filtered) || filtered.length === 0) {
            window.currentOpportunities = [];
            window.filteredOpportunities = [];
        } else {
            window.currentOpportunities = filtered;
            window.filteredOpportunities = filtered;
        }
        
        window.rolimonData = rolimonData;


        if (window.updateTradeFilterBar) window.updateTradeFilterBar();
        Pagination.setCurrentPage(1);
        
        if (window.filteredOpportunities && window.filteredOpportunities.length > 0) {
            Utils.delay(100).then(() => {
                if (window.filteredOpportunities && window.filteredOpportunities.length > 0) {
                    Pagination.displayCurrentPage().catch(() => {});
                } else {
                }
            });
        } else {
            const container = document.getElementById('send-trades-grid');
            if (container && window.displayTradeOpportunities) {
                window.displayTradeOpportunities([]);
            }
        }
        
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