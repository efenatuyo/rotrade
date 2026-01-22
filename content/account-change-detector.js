(function() {
    'use strict';

    let lastKnownUserId = null;
    let checkInterval = null;
    const CHECK_INTERVAL_MS = 2000;

    const ACCOUNT_SPECIFIC_KEYS = [
        'autoTrades',
        'pendingExtensionTrades',
        'sentTrades',
        'sentTradeHistory',
        'finalizedExtensionTrades',
        'notifiedTrades'
    ];

    const ACCOUNT_SPECIFIC_CACHE_KEYS = [
        'globalUserStats',
        'currentOpportunities',
        'filteredOpportunities',
        'tradeUserPools',
        'sentTrades',
        'userStatsLoadingInProgress'
    ];

    function saveAccountData(userId) {
        if (!userId) return;

        const accountData = {
            storage: {},
            caches: {}
        };

        ACCOUNT_SPECIFIC_KEYS.forEach(key => {
            try {
                const accountKey = `${key}_${userId}`;
                const value = localStorage.getItem(accountKey);
                if (value !== null) {
                    accountData.storage[key] = JSON.parse(value);
                }
            } catch (e) {}
        });

        ACCOUNT_SPECIFIC_CACHE_KEYS.forEach(key => {
            try {
                if (key === 'globalUserStats' && window.globalUserStats) {
                    accountData.caches[key] = Array.from(window.globalUserStats.entries());
                } else if (key === 'sentTrades' && window.sentTrades) {
                    accountData.caches[key] = Array.from(window.sentTrades);
                } else if (key === 'userStatsLoadingInProgress' && window.userStatsLoadingInProgress) {
                    accountData.caches[key] = Array.from(window.userStatsLoadingInProgress);
                } else if (window[key] !== undefined) {
                    accountData.caches[key] = window[key];
                }
            } catch (e) {}
        });

        try {
            localStorage.setItem(`accountData_${userId}`, JSON.stringify(accountData));
        } catch (e) {}
    }

    function loadAccountData(userId) {
        if (!userId) return;

        try {
            const stored = localStorage.getItem(`accountData_${userId}`);
            if (!stored) return;

            const accountData = JSON.parse(stored);

            Object.keys(accountData.storage || {}).forEach(key => {
                try {
                    const accountKey = `${key}_${userId}`;
                    localStorage.setItem(accountKey, JSON.stringify(accountData.storage[key]));
                } catch (e) {}
            });

            Object.keys(accountData.caches || {}).forEach(key => {
                try {
                    if (key === 'globalUserStats') {
                        window.globalUserStats = new Map(accountData.caches[key] || []);
                    } else if (key === 'sentTrades') {
                        window.sentTrades = new Set(accountData.caches[key] || []);
                    } else if (key === 'userStatsLoadingInProgress') {
                        window.userStatsLoadingInProgress = new Set(accountData.caches[key] || []);
                    } else {
                        window[key] = accountData.caches[key];
                    }
                } catch (e) {}
            });
        } catch (e) {}
    }

    async function handleAccountChange(oldUserId, newUserId) {
        if (oldUserId) {
            saveAccountData(oldUserId);
        }

        if (API.clearUserIdCache) {
            API.clearUserIdCache();
        }

        Storage.setCurrentAccountId(newUserId);
        Storage.clearAccountCache();

        if (window.globalUserStats) {
            window.globalUserStats.clear();
        }
        if (window.currentOpportunities) {
            window.currentOpportunities = [];
        }
        if (window.filteredOpportunities) {
            window.filteredOpportunities = [];
        }
        if (window.userStatsLoadingInProgress) {
            window.userStatsLoadingInProgress.clear();
        }
        if (window.tradeUserPools) {
            window.tradeUserPools = {};
        }
        window.sentTrades = new Set();

        loadAccountData(newUserId);

        if (window.Pagination && window.Pagination.setCurrentPage) {
            window.Pagination.setCurrentPage(1);
        }

        const pathname = window.location.pathname;
        const normalizedPath = pathname.replace(/^\/([a-z]{2})\//, '/') || '/';
        if (normalizedPath === '/auto-trades' && window.loadTradeOpportunities) {
            setTimeout(() => {
                if (window.loadTradeOpportunities) {
                    window.loadTradeOpportunities();
                }
            }, 500);
        }
    }

    async function checkAccountChange() {
        try {
            const currentUserId = API.getCurrentUserIdSync ? API.getCurrentUserIdSync() : (await API.getCurrentUserId());
            
            if (!currentUserId) {
                return;
            }

            if (lastKnownUserId === null) {
                lastKnownUserId = currentUserId;
                Storage.setCurrentAccountId(currentUserId);
                loadAccountData(currentUserId);
                return;
            }

            if (lastKnownUserId !== currentUserId) {
                const oldUserId = lastKnownUserId;
                lastKnownUserId = currentUserId;
                await handleAccountChange(oldUserId, currentUserId);
            }
        } catch (e) {}
    }

    function startMonitoring() {
        stopMonitoring();
        checkAccountChange();
        checkInterval = setInterval(checkAccountChange, CHECK_INTERVAL_MS);
    }

    function stopMonitoring() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(startMonitoring, 1000);
            });
        } else {
            setTimeout(startMonitoring, 1000);
        }

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                checkAccountChange();
            }
        });

        window.addEventListener('focus', checkAccountChange);
    }

    init();

    window.AccountChangeDetector = {
        start: startMonitoring,
        stop: stopMonitoring,
        check: checkAccountChange
    };

})();
