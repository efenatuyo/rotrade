(function() {
    'use strict';

    const OpportunityFetcher = window.OpportunityFetcher || {};
    const ProgressTracker = window.ProgressTracker || class {};
    const StateManager = window.StateManager;

    let isSendingAllTrades = false;
    let shouldStopSending = false;
    let globalAbortController = null;

    function getIsSendingAllTrades() {
        return isSendingAllTrades;
    }

    function shouldStopCheck() {
        return shouldStopSending || globalAbortController?.signal?.aborted || !isSendingAllTrades;
    }

    async function fetchNewOpportunitiesForTrade(tradeId, neededCount) {
        return OpportunityFetcher.fetchNewOpportunitiesForTrade?.(tradeId, neededCount, shouldStopCheck) || [];
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
            if (window.SendAllProgressDialog && window.SendAllProgressDialog.addStatusLog) {
                window.SendAllProgressDialog.addStatusLog(0, 3, `Starting to send ${opportunitiesToSend.length} trade${opportunitiesToSend.length !== 1 ? 's' : ''}...`, 'info');
            }
        }, 100);

        const progressTracker = new ProgressTracker();
        
        try {
            if (opportunitiesToSend.length === 0) {
                window.SendAllProgressDialog.close();
                if (window.extensionAlert) {
                    await window.extensionAlert('No Trades', 'There are no trades available to send.', 'info');
                }
                return;
            }
            
            progressTracker.initializeGoals(opportunitiesToSend);

            let currentIndex = 0;
            let attemptsWithoutProgress = 0;
            const maxAttemptsWithoutProgress = opportunitiesToSend.length * 2;

            while (currentIndex < opportunitiesToSend.length || attemptsWithoutProgress < maxAttemptsWithoutProgress) {
                if (shouldStopCheck()) {
                    break;
                }

                const availableResult = progressTracker.hasAvailableOpportunity(opportunitiesToSend, currentIndex);
                let opportunity = availableResult?.opportunity || null;
                if (availableResult) {
                    currentIndex = availableResult.index + 1;
                }

                if (!opportunity) {
                    if (progressTracker.allGoalsReached()) {
                        break;
                    }

                    let fetchedNewOpportunities = false;
                    const tradesNeedingMore = progressTracker.getTradesNeedingMore();

                    if (tradesNeedingMore.length > 0 && attemptsWithoutProgress < 3) {
                        const progressText = progressDialog?.querySelector('#progress-text');
                        if (progressText) {
                            const totalSuccess = progressTracker.getTotalSuccess();
                            const totalGoal = progressTracker.getTotalGoal();
                            progressText.textContent = `Fetching new opportunities... (${totalSuccess} / ${totalGoal} trades sent)`;
                        }

                        for (const [tradeId, goal] of tradesNeedingMore) {
                            if (shouldStopCheck()) break;
                            
                            const successCount = progressTracker.getSuccessCount(tradeId);
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
                            const totalSuccess = progressTracker.getTotalSuccess();
                            const totalGoal = progressTracker.getTotalGoal();
                            const opportunitiesToShow = progressTracker.getFilteredOpportunities(opportunitiesToSend, isAllTrades);
                            window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedCount, isAllTrades);
                            continue;
                        }
                    }

                    attemptsWithoutProgress++;
                    if (attemptsWithoutProgress >= maxAttemptsWithoutProgress) {
                        break;
                    }

                    continue;
                }

                attemptsWithoutProgress = 0;
                const tradeId = String(opportunity.id || '');
                const opportunitiesToShow = isAllTrades ? opportunitiesToSend : [opportunity];
                const totalGoal = progressTracker.getTotalGoal();
                const totalSuccess = progressTracker.getTotalSuccess();
                window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedCount, isAllTrades);

                const abortController = new AbortController();
                if (currentAbortController === globalAbortController && globalAbortController) {
                    globalAbortController.signal.addEventListener('abort', () => {
                        abortController.abort();
                    });
                }

                let challengeDetected = false;
                let tradeResult = null;

                const onStatusUpdate = (step, totalSteps, message, type) => {
                    if (window.SendAllProgressDialog && window.SendAllProgressDialog.addStatusLog) {
                        window.SendAllProgressDialog.addStatusLog(step, totalSteps, message, type);
                    }
                };

                try {
                    tradeResult = await window.SendAllTradeSender.sendSingleTrade(opportunity, abortController.signal, shouldStopCheck, onStatusUpdate);
                } catch (error) {
                    if (window.SendAllChallengeHandler && window.SendAllChallengeHandler.isChallengeError(error)) {
                        challengeDetected = true;
                        tradeResult = { success: false, reason: 'challenge_required', error };
                        onStatusUpdate(3, 3, `2FA challenge detected`, 'warning');
                    } else {
                        tradeResult = { success: false, reason: 'error', error };
                        onStatusUpdate(3, 3, `Error: ${error?.message || 'Unknown error'}`, 'error');
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

                    try {
                        tradeResult = await window.SendAllTradeSender.sendSingleTrade(opportunity, abortController.signal, shouldStopCheck, onStatusUpdate);
                    } catch (error) {
                        tradeResult = { success: false, reason: 'error', error };
                        onStatusUpdate(3, 3, `Error: ${error?.message || 'Unknown error'}`, 'error');
                    }
                }

                if (shouldStopCheck()) {
                    break;
                }

                if (tradeResult && tradeResult.success) {
                    progressTracker.recordSuccess(tradeId);
                    successCount++;
                    
                    const sentTradeKey = `${String(opportunity.id)}-${String(opportunity.targetUserId)}`;
                    if (!window.sentTrades) {
                        const stored = Storage.getAccount('sentTrades', []);
                        window.sentTrades = new Set(stored.map(key => String(key)));
                    }
                    if (!window.sentTrades.has(sentTradeKey)) {
                        window.sentTrades.add(sentTradeKey);
                        Storage.setAccount('sentTrades', Array.from(window.sentTrades).map(key => String(key)));
                        Storage.flush();
                    }
                    
                    window.currentOpportunities = (window.currentOpportunities || []).filter(
                        opp => !(String(opp.id) === String(opportunity.id) && String(opp.targetUserId) === String(opportunity.targetUserId))
                    );
                    window.filteredOpportunities = (window.filteredOpportunities || []).filter(
                        opp => !(String(opp.id) === String(opportunity.id) && String(opp.targetUserId) === String(opportunity.targetUserId))
                    );
                    
                    const totalSuccess = progressTracker.getTotalSuccess();
                    const totalGoal = progressTracker.getTotalGoal();
                    const opportunitiesToShow = isAllTrades ? opportunitiesToSend.filter(opp => {
                        const key = `${String(opp.id)}-${String(opp.targetUserId)}`;
                        return !window.sentTrades.has(key);
                    }) : (currentIndex < opportunitiesToSend.length ? [opportunitiesToSend[currentIndex]] : []);
                    window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedCount, isAllTrades);
                    
                    if (progressTracker.allGoalsReached()) {
                        break;
                    }
                } else {
                    if (tradeResult && tradeResult.privacyRestricted) {
                        const userId = opportunity.targetUserId;
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
                    } else {
                        failedCount++;
                    }
                    
                    const totalSuccess = progressTracker.getTotalSuccess();
                    const totalGoal = progressTracker.getTotalGoal();
                    
                    if (!window.sentTrades) {
                        const stored = Storage.getAccount('sentTrades', []);
                        window.sentTrades = new Set(stored.map(key => String(key)));
                    }
                    
                    if (!window.privacyRestrictedUsers) {
                        const stored = Storage.getAccount('privacyRestrictedUsers', []);
                        window.privacyRestrictedUsers = new Set(stored.map(id => String(id)));
                    }
                    
                    const opportunitiesToShow = isAllTrades ? opportunitiesToSend.filter(opp => {
                        const key = `${String(opp.id)}-${String(opp.targetUserId)}`;
                        const isSent = window.sentTrades.has(key);
                        const isRestricted = window.privacyRestrictedUsers.has(String(opp.targetUserId));
                        return !isSent && !isRestricted;
                    }) : (currentIndex < opportunitiesToSend.length ? [opportunitiesToSend[currentIndex]] : []);
                    window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedCount, isAllTrades);
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
                    const totalSuccess = progressTracker.getTotalSuccess() || successCount;
                    const totalGoal = progressTracker.getTotalGoal() || opportunitiesToSend.length;
                    
                    if (!window.sentTrades) {
                        const stored = Storage.getAccount('sentTrades', []);
                        window.sentTrades = new Set(stored.map(key => String(key)));
                    }
                    
                    const remainingOpportunities = opportunitiesToSend.filter(opp => {
                        const key = `${String(opp.id)}-${String(opp.targetUserId)}`;
                        return !window.sentTrades.has(key);
                    });
                    
                    window.currentOpportunities = (window.currentOpportunities || []).filter(opp => {
                        const key = `${String(opp.id)}-${String(opp.targetUserId)}`;
                        return !window.sentTrades.has(key);
                    });
                    window.filteredOpportunities = (window.filteredOpportunities || []).filter(opp => {
                        const key = `${String(opp.id)}-${String(opp.targetUserId)}`;
                        return !window.sentTrades.has(key);
                    });
                    
                    const opportunitiesToShow = isAllTrades ? remainingOpportunities : (opportunitiesToSend.length > 0 ? [opportunitiesToSend[opportunitiesToSend.length - 1]] : []);
                    window.SendAllProgressDialog.update(totalSuccess, totalGoal, opportunitiesToShow, failedCount, isAllTrades);

                    setTimeout(() => {
                        window.SendAllProgressDialog.close();

                        const message = `Finished sending trades. ${successCount} succeeded, ${failedCount} failed.`;

                        if (window.extensionAlert) {
                            window.extensionAlert('Send All Trades Complete', message, 'info');
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
        setupSendAllTradesButton: setupSendAllTradesButton,
        isSendingAllTrades: getIsSendingAllTrades
    };

    window.setupSendAllTradesButton = setupSendAllTradesButton;

})();
