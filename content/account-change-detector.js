(function () {
    'use strict';
    let lastKnownUserId = null;
    let checkInterval = null;
    const CHECK_INTERVAL_MS = 2e3;
    const ACCOUNT_SPECIFIC_CACHE_KEYS = [
        'globalUserStats',
        'currentOpportunities',
        'filteredOpportunities',
        'tradeUserPools',
        'sentTrades',
        'userStatsLoadingInProgress',
    ];
    function saveAccountData(userId) {
        if (!userId) return;
        const caches = {};
        ACCOUNT_SPECIFIC_CACHE_KEYS.forEach((key) => {
            try {
                if (key === 'globalUserStats' && window.globalUserStats) {
                    caches[key] = Array.from(window.globalUserStats.entries());
                } else if (key === 'sentTrades' && window.sentTrades) {
                    caches[key] = Array.from(window.sentTrades);
                } else if (
                    key === 'userStatsLoadingInProgress' &&
                    window.userStatsLoadingInProgress
                ) {
                    caches[key] = Array.from(window.userStatsLoadingInProgress);
                } else if (window[key] !== undefined) {
                    caches[key] = window[key];
                }
            } catch (e) {}
        });
        try {
            localStorage.setItem(`accountData_${userId}`, JSON.stringify(caches));
        } catch (e) {}
    }
    function loadAccountData(userId) {
        if (!userId) return;
        try {
            const stored = localStorage.getItem(`accountData_${userId}`);
            if (!stored) return;
            let caches = JSON.parse(stored);
            if (caches && typeof caches === 'object' && caches.caches) {
                caches = caches.caches;
            }
            Object.keys(caches || {}).forEach((key) => {
                try {
                    if (key === 'globalUserStats') {
                        window.globalUserStats = new Map(caches[key] || []);
                    } else if (key === 'sentTrades') {
                        window.sentTrades = new Set(caches[key] || []);
                    } else if (key === 'userStatsLoadingInProgress') {
                        window.userStatsLoadingInProgress = new Set(caches[key] || []);
                    } else {
                        window[key] = caches[key];
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
        if (Storage.preloadAccountData) {
            await Storage.preloadAccountData(newUserId);
        }
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
        if (window._paginationMemory) {
            window._paginationMemory = {};
        }
        loadAccountData(newUserId);
        if (window.Pagination && window.Pagination.setCurrentPage) {
            window.Pagination.setCurrentPage(1);
        }
        const pathname = window.location.pathname;
        const normalizedPath = window.Routing ? window.Routing.normalizePath(pathname) : pathname;
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
            const currentUserId = API.getCurrentUserIdSync
                ? API.getCurrentUserIdSync()
                : await API.getCurrentUserId();
            if (!currentUserId) {
                return;
            }
            if (lastKnownUserId === null) {
                lastKnownUserId = currentUserId;
                Storage.setCurrentAccountId(currentUserId);
                if (Storage.preloadAccountData) {
                    await Storage.preloadAccountData(currentUserId);
                }
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
        if (window.Scheduler) {
            window.Scheduler.everyVisible(
                'accountChangeDetector',
                CHECK_INTERVAL_MS,
                checkAccountChange
            );
        } else {
            checkInterval = setInterval(checkAccountChange, CHECK_INTERVAL_MS);
        }
    }
    function stopMonitoring() {
        if (window.Scheduler) {
            window.Scheduler.cancel('accountChangeDetector');
        }
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
    }
    let pendingCheck = 0;
    function debouncedCheck() {
        if (pendingCheck) return;
        pendingCheck = setTimeout(() => {
            pendingCheck = 0;
            checkAccountChange();
        }, 250);
    }
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(startMonitoring, 1e3);
            });
        } else {
            setTimeout(startMonitoring, 1e3);
        }
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                debouncedCheck();
            }
        });
        window.addEventListener('focus', debouncedCheck);
    }
    init();
    window.AccountChangeDetector = {
        start: startMonitoring,
        stop: stopMonitoring,
        check: checkAccountChange,
    };
})();
