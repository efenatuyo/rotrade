(function() {
    'use strict';

    let isSendingAllTrades = false;
    let shouldStopSending = false;
    let globalAbortController = null;

    function shouldStopCheck() {
        return shouldStopSending || globalAbortController?.signal?.aborted || !isSendingAllTrades;
    }

    async function fetchNewOpportunitiesForTrade(tradeId, neededCount) {
        if (shouldStopCheck()) return [];
        
        const autoTrades = Storage.get('autoTrades', []);
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

        const oldSentTrades = new Set(Storage.get('sentTrades', []));
        const history = Trades.getSentTradeHistory();
        const now = Date.now();
        const expiryMs = settings.tradeMemoryDays * 24 * 60 * 60 * 1000;
        const validHistory = history.filter(entry => (now - entry.timestamp) < expiryMs);

        const freshOwners = [];
        for (const userId of userIds) {
            if (shouldStopCheck()) break;
            
            const tradeKey = `${trade.id}-${userId}`;
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
            }
        }

        return newOpportunities;
    }

    async function sendAllTrades() {
        if (isSendingAllTrades) {
            if (window.extensionAlert) {
                await window.extensionAlert('Already Sending', 'A trade sending process is already in progress. Please wait for it to complete or stop it first.', 'info');
            }
            return;
        }

        const activeFilter = document.querySelector('.trade-filter-chip.active');
        const isAllTrades = !activeFilter || activeFilter.dataset.tradeName === 'all';
        
        let opportunitiesToSend = [];
        
        if (isAllTrades) {
            opportunitiesToSend = [...(window.filteredOpportunities || window.currentOpportunities || [])];
        } else {
            const tradeId = activeFilter.dataset.tradeId;
            opportunitiesToSend = (window.filteredOpportunities || window.currentOpportunities || []).filter(
                opp => String(opp.id) === String(tradeId)
            );
        }

        if (opportunitiesToSend.length === 0) {
            if (window.extensionAlert) {
                await window.extensionAlert('No Trades', 'There are no trades available to send.', 'info');
            }
            return;
        }

        const confirmed = await window.extensionConfirm(
            'Send All Trades',
            `Are you sure you want to send ${opportunitiesToSend.length} trade${opportunitiesToSend.length !== 1 ? 's' : ''}?`,
            'Send All',
            'Cancel'
        );

        if (!confirmed) {
            return;
        }

        if (isSendingAllTrades) {
            return;
        }

        isSendingAllTrades = true;
        shouldStopSending = false;
        const currentAbortController = new AbortController();
        globalAbortController = currentAbortController;

        let successCount = 0;
        let failedCount = 0;
        let failedDueToOwnerSettings = 0;
        let stopWasPressed = false;
        
        const progressDialog = window.SendAllProgressDialog.create(() => {
            stopWasPressed = true;
            shouldStopSending = true;
            if (currentAbortController === globalAbortController) {
                if (globalAbortController) {
                    globalAbortController.abort();
                }
                isSendingAllTrades = false;
                shouldStopSending = false;
                globalAbortController = null;
            }
            
            window.SendAllProgressDialog.close();
            
            const message = `Stopped sending trades. ${successCount} succeeded, ${failedCount} failed.`;
            if (window.extensionAlert) {
                window.extensionAlert('Send All Trades Stopped', message, 'info');
            }
        });
        
        setTimeout(() => {
            window.SendAllProgressDialog.update(0, opportunitiesToSend.length, opportunitiesToSend, 0, isAllTrades);
        }, 100);

        try {
            if (opportunitiesToSend.length === 0) {
                window.SendAllProgressDialog.close();
                if (window.extensionAlert) {
                    await window.extensionAlert('No Trades', 'There are no trades available to send.', 'info');
                }
                return;
            }

            const tradeConfigGoals = new Map();
            const tradeConfigSuccessCounts = new Map();
            
            opportunitiesToSend.forEach(opp => {
                const tradeId = String(opp.id || '');
                if (!tradeConfigGoals.has(tradeId)) {
                    const autoTrades = Storage.get('autoTrades', []);
                    const storedTrade = autoTrades.find(t => String(t.id) === tradeId);
                    const maxTrades = storedTrade?.settings?.maxTrades || storedTrade?.settings?.maxTradesPerDay || 5;
                    const currentCount = Trades.getTodayTradeCount(tradeId);
                    const goal = maxTrades - currentCount;
                    tradeConfigGoals.set(tradeId, Math.max(0, goal));
                    tradeConfigSuccessCounts.set(tradeId, 0);
                }
            });

            let currentIndex = 0;
            let attemptsWithoutProgress = 0;
            const maxAttemptsWithoutProgress = opportunitiesToSend.length * 2;

            while (currentIndex < opportunitiesToSend.length || attemptsWithoutProgress < maxAttemptsWithoutProgress) {
                if (shouldStopCheck()) {
                    break;
                }

                let opportunity = null;
                let foundAvailable = false;

                for (let i = currentIndex; i < opportunitiesToSend.length; i++) {
                    const opp = opportunitiesToSend[i];
                    const tradeId = String(opp.id || '');
                    const goal = tradeConfigGoals.get(tradeId) || 0;
                    const successCount = tradeConfigSuccessCounts.get(tradeId) || 0;

                    if (goal > 0 && successCount < goal) {
                        opportunity = opp;
                        currentIndex = i + 1;
                        foundAvailable = true;
                        break;
                    }
                }

                if (!opportunity) {
                    const allGoalsReached = Array.from(tradeConfigGoals.entries()).every(([tradeId, goal]) => {
                        const successCount = tradeConfigSuccessCounts.get(tradeId) || 0;
                        return goal <= 0 || successCount >= goal;
                    });

                    if (allGoalsReached) {
                        break;
                    }

                    let fetchedNewOpportunities = false;
                    const tradesNeedingMore = Array.from(tradeConfigGoals.entries()).filter(([tradeId, goal]) => {
                        const successCount = tradeConfigSuccessCounts.get(tradeId) || 0;
                        return goal > 0 && successCount < goal;
                    });

                    if (tradesNeedingMore.length > 0 && attemptsWithoutProgress < 3) {
                        const progressText = progressDialog?.querySelector('#progress-text');
                        if (progressText) {
                            progressText.textContent = `Fetching new opportunities... (${Array.from(tradeConfigSuccessCounts.values()).reduce((sum, count) => sum + count, 0)} / ${Array.from(tradeConfigGoals.values()).reduce((sum, goal) => sum + goal, 0)} trades sent)`;
                        }

                        for (const [tradeId, goal] of tradesNeedingMore) {
                            if (shouldStopCheck()) break;
                            
                            const successCount = tradeConfigSuccessCounts.get(tradeId) || 0;
                            const needed = goal - successCount;
                            
                            if (needed > 0) {
                                const newOpps = await fetchNewOpportunitiesForTrade(tradeId, needed);
                                if (newOpps.length > 0) {
                                    opportunitiesToSend.push(...newOpps);
                                    fetchedNewOpportunities = true;
                                }
                            }
                        }

                        if (fetchedNewOpportunities) {
                            attemptsWithoutProgress = 0;
                            currentIndex = 0;
                            const totalSuccess = Array.from(tradeConfigSuccessCounts.values()).reduce((sum, count) => sum + count, 0);
                            const totalGoal = Array.from(tradeConfigGoals.values()).reduce((sum, goal) => sum + goal, 0);
                            const opportunitiesToShow = isAllTrades ? opportunitiesToSend : opportunitiesToSend.filter(opp => {
                                const oppTradeId = String(opp.id || '');
                                const goal = tradeConfigGoals.get(oppTradeId) || 0;
                                const successCount = tradeConfigSuccessCounts.get(oppTradeId) || 0;
                                return goal > 0 && successCount < goal;
                            });
                            window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedDueToOwnerSettings, isAllTrades);
                            continue;
                        }
                    }

                    attemptsWithoutProgress++;
                    if (attemptsWithoutProgress >= maxAttemptsWithoutProgress) {
                        break;
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                attemptsWithoutProgress = 0;
                const tradeId = String(opportunity.id || '');
                const opportunitiesToShow = isAllTrades ? opportunitiesToSend : [opportunity];
                const totalGoal = Array.from(tradeConfigGoals.values()).reduce((sum, goal) => sum + goal, 0);
                const totalSuccess = Array.from(tradeConfigSuccessCounts.values()).reduce((sum, count) => sum + count, 0);
                window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedDueToOwnerSettings, isAllTrades);

                const abortController = new AbortController();
                if (currentAbortController === globalAbortController && globalAbortController) {
                    globalAbortController.signal.addEventListener('abort', () => {
                        abortController.abort();
                    });
                }

                let challengeDetected = false;
                let tradeResult = null;

                try {
                    tradeResult = await window.SendAllTradeSender.sendSingleTrade(opportunity, abortController.signal, shouldStopCheck);
                } catch (error) {
                    if (window.SendAllChallengeHandler && window.SendAllChallengeHandler.isChallengeError(error)) {
                        challengeDetected = true;
                        tradeResult = { success: false, reason: 'challenge_required', error };
                    } else {
                        tradeResult = { success: false, reason: 'error', error };
                    }
                }

                if (challengeDetected || (tradeResult && tradeResult.reason === 'challenge_required')) {
                    const progressText = progressDialog?.querySelector('#progress-text');
                    if (progressText) {
                        progressText.textContent = `Waiting for 2FA... (${totalSuccess} / ${totalGoal} trades sent)`;
                    }

                    const challengeCompleted = await window.SendAllChallengeHandler.waitForCompletion(120000, shouldStopCheck);
                    
                    if (!challengeCompleted || shouldStopCheck()) {
                        break;
                    }

                    if (progressText) {
                        progressText.textContent = `${totalSuccess} / ${totalGoal} trades sent`;
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));

                    try {
                        tradeResult = await window.SendAllTradeSender.sendSingleTrade(opportunity, abortController.signal, shouldStopCheck);
                    } catch (error) {
                        tradeResult = { success: false, reason: 'error', error };
                    }
                }

                if (shouldStopCheck()) {
                    break;
                }

                if (tradeResult && tradeResult.success) {
                    const currentSuccess = tradeConfigSuccessCounts.get(tradeId) || 0;
                    tradeConfigSuccessCounts.set(tradeId, currentSuccess + 1);
                    successCount++;
                    const totalSuccess = Array.from(tradeConfigSuccessCounts.values()).reduce((sum, count) => sum + count, 0);
                    const opportunitiesToShow = isAllTrades ? opportunitiesToSend : (currentIndex < opportunitiesToSend.length ? [opportunitiesToSend[currentIndex]] : []);
                    window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedDueToOwnerSettings, isAllTrades);
                } else {
                    failedCount++;
                    if (tradeResult && tradeResult.reason === 'cannot_trade') {
                        failedDueToOwnerSettings++;
                    }
                    const totalSuccess = Array.from(tradeConfigSuccessCounts.values()).reduce((sum, count) => sum + count, 0);
                    window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedDueToOwnerSettings, isAllTrades);
                }

                if (shouldStopCheck()) {
                    break;
                }
            }
        } finally {
            if (currentAbortController === globalAbortController) {
                shouldStopSending = false;
                if (globalAbortController) {
                    globalAbortController.abort();
                    globalAbortController = null;
                }
                isSendingAllTrades = false;

                if (!stopWasPressed) {
                    const totalSuccess = Array.from(tradeConfigSuccessCounts.values()).reduce((sum, count) => sum + count, 0);
                    const totalGoal = Array.from(tradeConfigGoals.values()).reduce((sum, goal) => sum + goal, 0);
                    const opportunitiesToShow = isAllTrades ? opportunitiesToSend : (opportunitiesToSend.length > 0 ? [opportunitiesToSend[opportunitiesToSend.length - 1]] : []);
                    window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedDueToOwnerSettings, isAllTrades);

                    setTimeout(() => {
                        window.SendAllProgressDialog.close();

                        const message = `Finished sending trades. ${successCount} succeeded, ${failedCount} failed.`;

                        if (window.extensionAlert) {
                            window.extensionAlert('Send All Trades Complete', message, 'info');
                        }
                    }, 1000);
                }
            }
        }
    }

    function setupSendAllTradesButton() {
        const sendAllBtn = document.getElementById('send-all-trades-btn');
        if (sendAllBtn) {
            sendAllBtn.addEventListener('click', () => {
                sendAllTrades();
            });
        }
    }

    window.SendAllTrades = {
        sendAllTrades: sendAllTrades,
        setupSendAllTradesButton: setupSendAllTradesButton
    };

    window.setupSendAllTradesButton = setupSendAllTradesButton;

})();
