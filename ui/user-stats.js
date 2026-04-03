(function () {
    'use strict';
    function statsKey(id) {
        return String(id);
    }
    function clearSendTradesUserStatsCache() {
        if (window.globalUserStats) {
            window.globalUserStats.clear();
        }
    }
    async function getCachedUserStats(userIds) {
        if (!window.globalUserStats) {
            window.globalUserStats = new Map();
        }
        const missingIds = [];
        const results = new Map();
        userIds.forEach((id) => {
            const key = statsKey(id);
            if (window.globalUserStats.has(key)) {
                results.set(key, window.globalUserStats.get(key));
            } else {
                missingIds.push(id);
            }
        });
        return {
            cached: results,
            missing: missingIds,
        };
    }
    async function getUserRapAndValue() {
        try {
            let rolimonData = window.rolimonData || {};
            if (Object.keys(rolimonData).length === 0) {
                try {
                    const response = await chrome.runtime.sendMessage({
                        action: 'fetchRolimons',
                    });
                    if (response && response.success) {
                        rolimonData = response.data.items || {};
                        window.rolimonData = rolimonData;
                    }
                } catch (error) {}
            }
            const currentOpportunities = window.filteredOpportunities || [];
            const tradesPerPage =
                window.Pagination && typeof window.Pagination.getTradesPerPage === 'function'
                    ? window.Pagination.getTradesPerPage()
                    : 9;
            const currentPageNum =
                window.Pagination && typeof window.Pagination.getCurrentPage === 'function'
                    ? await window.Pagination.getCurrentPage()
                    : 1;
            const startIndex = (currentPageNum - 1) * tradesPerPage;
            const endIndex = startIndex + tradesPerPage;
            const currentPageOpportunities = currentOpportunities.slice(startIndex, endIndex);
            let userIds = currentPageOpportunities.map((opp) => opp.targetUserId);
            if (userIds.length === 0) return new Map();
            if (!window.globalUserStats) window.globalUserStats = new Map();
            if (!window.userStatsLoadingInProgress) window.userStatsLoadingInProgress = new Set();
            const cacheCheck = await getCachedUserStats(userIds);
            if (cacheCheck.cached.size > 0) {
                cacheCheck.cached.forEach((stats, id) => {
                    updateSpecificUserCard(statsKey(id), stats);
                });
            }
            if (cacheCheck.missing.length === 0) {
                return window.globalUserStats;
            }
            const usersToProcess = cacheCheck.missing;
            displayLoadingStats(usersToProcess);
            let response;
            try {
                const messagePromise = new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        {
                            action: 'fetchPlayerAssets',
                            userIds: usersToProcess,
                        },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(response);
                            }
                        }
                    );
                });
                const timeoutResult = await Utils.withTimeout(messagePromise, 3e4);
                if (!timeoutResult.ok) {
                    throw new Error(timeoutResult.error?.message || 'Request timeout or failed');
                }
                response = timeoutResult.data;
            } catch (error) {
                const errorStats = {
                    totalRap: 0,
                    totalValue: 0,
                    limitedCount: 0,
                    error: true,
                    isLoading: false,
                };
                usersToProcess.forEach((userId) => {
                    const k = statsKey(userId);
                    window.globalUserStats.set(k, errorStats);
                    updateSpecificUserCard(k, errorStats);
                });
                return window.globalUserStats;
            }
            if (!response || !response.success) {
                const errorStats = {
                    totalRap: 0,
                    totalValue: 0,
                    limitedCount: 0,
                    error: true,
                    isLoading: false,
                };
                usersToProcess.forEach((userId) => {
                    const k = statsKey(userId);
                    window.globalUserStats.set(k, errorStats);
                    updateSpecificUserCard(k, errorStats);
                });
                return window.globalUserStats;
            }
            if (!response.data) {
                const errorStats = {
                    totalRap: 0,
                    totalValue: 0,
                    limitedCount: 0,
                    error: true,
                    isLoading: false,
                };
                usersToProcess.forEach((userId) => {
                    const k = statsKey(userId);
                    window.globalUserStats.set(k, errorStats);
                    updateSpecificUserCard(k, errorStats);
                });
                return window.globalUserStats;
            }
            const allUserData = response.data.results || {};
            const failedUsers = response.data.failedUsers || [];
            const failedUserIds = failedUsers.map((f) => f.userId);
            const successIds = [];
            const processedUserIds = new Set();
            const processPromises = usersToProcess.map(async (userId) => {
                const k = statsKey(userId);
                const userAssets = allUserData[userId] ?? allUserData[k];
                if (userAssets) {
                    const stats = calculateUserStatsFromAssets(userAssets, rolimonData);
                    window.globalUserStats.set(k, stats);
                    updateSpecificUserCard(k, stats);
                    successIds.push(userId);
                    processedUserIds.add(k);
                }
            });
            await Promise.all(processPromises);
            for (const userId of usersToProcess) {
                const k = statsKey(userId);
                if (
                    !processedUserIds.has(k) &&
                    !failedUserIds.includes(userId) &&
                    !failedUserIds.includes(k)
                ) {
                    const errorStats = {
                        totalRap: 0,
                        totalValue: 0,
                        limitedCount: 0,
                        error: true,
                        isLoading: false,
                    };
                    window.globalUserStats.set(k, errorStats);
                    updateSpecificUserCard(k, errorStats);
                }
            }
            if (failedUserIds.length > 0) {
                await Utils.delay(2e3);
                for (let i = 0; i < failedUserIds.length; i++) {
                    const userId = failedUserIds[i];
                    const k = statsKey(userId);
                    const errorStats = {
                        totalRap: 0,
                        totalValue: 0,
                        limitedCount: 0,
                        error: true,
                        isLoading: false,
                    };
                    window.globalUserStats.set(k, errorStats);
                    updateSpecificUserCard(k, errorStats);
                }
            }
            updateUserCardsDisplay(userIds);
            return window.globalUserStats;
        } catch (error) {
            return new Map();
        }
    }
    function calculateUserStatsFromAssets(userAssets, rolimonData) {
        let totalRap = 0;
        let totalValue = 0;
        let limitedCount = 0;
        if (!userAssets || (typeof userAssets !== 'object' && !Array.isArray(userAssets))) {
            return {
                totalRap: 0,
                totalValue: 0,
                limitedCount: 0,
            };
        }
        if (typeof userAssets === 'object') {
            for (const [assetId, instanceIds] of Object.entries(userAssets)) {
                if (!Array.isArray(instanceIds) || instanceIds.length === 0) continue;
                const count = instanceIds.length;
                const rolimonItem =
                    rolimonData[assetId.toString()] ||
                    rolimonData[Number(assetId)] ||
                    rolimonData[assetId];
                if (rolimonItem && Array.isArray(rolimonItem) && rolimonItem.length >= 5) {
                    const rap = Number(rolimonItem[2]) || 0;
                    const value = Number(rolimonItem[4]) || 0;
                    totalRap += rap * count;
                    totalValue += value * count;
                    limitedCount += count;
                }
            }
        }
        return {
            totalRap: Math.round(totalRap),
            totalValue: Math.round(totalValue),
            limitedCount: limitedCount,
        };
    }
    function displayLoadingStats(userIds) {
        userIds.forEach((userId) => {
            if (!window.globalUserStats.has(statsKey(userId))) {
                const cards = document.querySelectorAll(`[data-user-id="${userId}"]`);
                cards.forEach((card) => {
                    const tradeCard = card.closest('.send-trade-card');
                    if (tradeCard) {
                        addUserStatsToCard(tradeCard, {
                            totalRap: 'Loading...',
                            totalValue: 'Loading...',
                            limitedCount: 0,
                            isLoading: true,
                        });
                    }
                });
            }
        });
    }
    function updateSpecificUserCard(userId, userStats) {
        const cards = document.querySelectorAll(`[data-user-id="${userId}"]`);
        cards.forEach((card) => {
            const tradeCard = card.closest('.send-trade-card');
            if (tradeCard) addUserStatsToCard(tradeCard, userStats);
        });
    }
    function updateUserCardsDisplay(userIds) {
        userIds.forEach((uid) => {
            const stats = window.globalUserStats.get(statsKey(uid));
            if (stats) updateSpecificUserCard(statsKey(uid), stats);
        });
    }
    function addUserStatsToCard(tradeCard, userStats) {
        if (!userStats) return;
        const existingStats = tradeCard.querySelector('.user-stats-info');
        if (existingStats) existingStats.remove();
        const userStatsToggle = document.getElementById('user-stats-toggle');
        const headerRightSection = tradeCard.querySelector('.header-right-section');
        if (!userStatsToggle || !userStatsToggle.checked) {
            if (headerRightSection) headerRightSection.classList.remove('stats-enabled');
            return;
        }
        if (headerRightSection) headerRightSection.classList.add('stats-enabled');
        const statsElement = document.createElement('div');
        statsElement.className = 'user-stats-info';
        let rapText, valueText;
        if (userStats.isLoading) {
            rapText = 'Loading...';
            valueText = 'Loading...';
        } else if (userStats.error) {
            rapText = 'Too quick';
            valueText = 'Slow down';
        } else {
            const rap = Number(userStats.totalRap);
            const val = Number(userStats.totalValue);
            rapText = isNaN(rap) ? '0' : rap.toLocaleString();
            valueText = isNaN(val) ? '0' : val.toLocaleString();
        }
        statsElement.innerHTML = `\n            <div class="user-stats-row">\n                <span class="stats-label">RAP:</span>\n                <span class="stats-value rap-text">${rapText}</span>\n            </div>\n            <div class="user-stats-row">\n                <span class="stats-label">VAL:</span>\n                <span class="stats-value val-text">${valueText}</span>\n            </div>\n            ${userStats.limitedCount > 0 && !userStats.isLoading ? `<div class="limited-count">${userStats.limitedCount} limiteds</div>` : ''}\n        `;
        const avatar = tradeCard.querySelector('.user-avatar-compact');
        if (headerRightSection && avatar) {
            headerRightSection.appendChild(statsElement);
        } else {
            const tradeHeader = tradeCard.querySelector('.send-trade-header');
            if (tradeHeader) tradeHeader.appendChild(statsElement);
        }
    }
    function toggleUserStatsVisibility() {
        const userStatsToggle = document.getElementById('user-stats-toggle');
        const allStatsElements = document.querySelectorAll('.user-stats-info');
        const allHeaderRightSections = document.querySelectorAll('.header-right-section');
        if (userStatsToggle && userStatsToggle.checked) {
            allStatsElements.forEach((stats) => {
                stats.style.display = 'flex';
            });
            allHeaderRightSections.forEach((section) => {
                section.classList.add('stats-enabled');
            });
            setTimeout(() => {
                loadCurrentUserStats();
            }, 100);
        } else {
            allStatsElements.forEach((stats) => {
                stats.style.display = 'none';
            });
            allHeaderRightSections.forEach((section) => {
                section.classList.remove('stats-enabled');
            });
        }
    }
    async function loadCurrentUserStats() {
        await getUserRapAndValue();
    }
    window.UserStats = {
        getCachedUserStats: getCachedUserStats,
        getUserRapAndValue: getUserRapAndValue,
        calculateUserStatsFromAssets: calculateUserStatsFromAssets,
        displayLoadingStats: displayLoadingStats,
        updateSpecificUserCard: updateSpecificUserCard,
        updateUserCardsDisplay: updateUserCardsDisplay,
        addUserStatsToCard: addUserStatsToCard,
        toggleUserStatsVisibility: toggleUserStatsVisibility,
        loadCurrentUserStats: loadCurrentUserStats,
        clearSendTradesUserStatsCache: clearSendTradesUserStatsCache,
    };
    window.loadCurrentUserStats = loadCurrentUserStats;
    window.toggleUserStatsVisibility = toggleUserStatsVisibility;
    window.clearSendTradesUserStatsCache = clearSendTradesUserStatsCache;
})();
