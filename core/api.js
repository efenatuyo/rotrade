(function() {
    'use strict';

    const rolimonsCache = { data: null, timestamp: 0, duration: 300000 };

    async function fetchRolimons() {
        const now = Date.now();
        if (rolimonsCache.data && (now - rolimonsCache.timestamp < rolimonsCache.duration)) {
            return Utils.ensureArray(rolimonsCache.data, []);
        }

        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: "fetchRolimons" }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve(Utils.ensureArray(rolimonsCache.data, []));
                        return;
                    }
                    if (response?.success && response.data?.items) {
                    const limiteds = [];
                    const items = response.data.items;
                    
                    if (typeof items !== 'object' || items === null) {
                        Utils.Logger.log('fetch_rolimons_invalid_items', { type: typeof items });
                        resolve(Utils.ensureArray(rolimonsCache.data, []));
                        return;
                    }

                    for (const [itemId, itemData] of Object.entries(items)) {
                        if (Array.isArray(itemData) && itemData.length >= 5) {
                            const name = Utils.ensureString(itemData[0], '');
                            const rap = Utils.ensureNumber(itemData[2], 0);
                            const value = Utils.ensureNumber(itemData[4], 0);

                            if (name && value > 0) {
                                limiteds.push({
                                    name: name.trim(),
                                    value: value,
                                    rap: rap,
                                    id: Utils.ensureNumber(itemId, 0),
                                    rarity: value > 50000 ? 'legendary' : value > 10000 ? 'rare' : 'common'
                                });
                            }
                        }
                    }
                    const sorted = limiteds.sort((a, b) => b.value - a.value);
                    rolimonsCache.data = sorted;
                    rolimonsCache.timestamp = now;
                    resolve(sorted);
                } else {
                    Utils.Logger.log('fetch_rolimons_failed', { 
                        success: response?.success, 
                        hasData: !!response?.data,
                        fallback: rolimonsCache.data ? 'using_cache' : 'empty'
                    });
                    resolve(Utils.ensureArray(rolimonsCache.data, []));
                    }
                });
            } catch (error) {
                resolve(Utils.ensureArray(rolimonsCache.data, []));
            }
        });
    }

    let cachedUserId = null;
    let cachedUserIdTimestamp = 0;
    const CACHE_DURATION = 60000;

    function clearUserIdCache() {
        cachedUserId = null;
        cachedUserIdTimestamp = 0;
    }

    function getCurrentUserIdSync() {
        try {
            const metaTag = document.querySelector('meta[name="user-data"]');
            if (metaTag) {
                const userId = metaTag.getAttribute('data-userid');
                if (userId && userId !== '0') {
                    const parsedId = parseInt(userId, 10);
                    if (!isNaN(parsedId) && parsedId > 0) {
                        if (cachedUserId !== parsedId) {
                            cachedUserId = parsedId;
                            cachedUserIdTimestamp = Date.now();
                        }
                        return parsedId;
                    }
                }
            }
        } catch (error) {
        }

        const now = Date.now();
        if (cachedUserId && (now - cachedUserIdTimestamp < CACHE_DURATION)) {
            return cachedUserId;
        }

        if (window.location.href.includes('/users/')) {
            const match = window.location.href.match(/\/users\/(\d+)/);
            if (match) {
                const parsedId = parseInt(match[1], 10);
                if (!isNaN(parsedId) && parsedId > 0) {
                    cachedUserId = parsedId;
                    cachedUserIdTimestamp = now;
                    return parsedId;
                }
            }
        }

        return null;
    }

    async function getCurrentUserId() {
        const syncResult = getCurrentUserIdSync();
        if (syncResult) {
            return syncResult;
        }

        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: "fetchUserAuth" }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve(null);
                        return;
                    }
                    if (response?.success && response.data?.id) {
                        const userId = parseInt(response.data.id, 10);
                        if (!isNaN(userId) && userId > 0) {
                            cachedUserId = userId;
                            cachedUserIdTimestamp = Date.now();
                            resolve(userId);
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            } catch (error) {
                resolve(null);
            }
        });
    }

    async function getUserCollectibles(userId) {
        try {
            const rolimonData = {};
            try {
                const response = await new Promise((resolve) => {
                    try {
                        chrome.runtime.sendMessage({ action: 'fetchRolimons' }, (response) => {
                            if (chrome.runtime.lastError) {
                                resolve({ success: false });
                            } else {
                                resolve(response);
                            }
                        });
                    } catch (error) {
                        resolve({ success: false });
                    }
                });
                if (response?.success) {
                    Object.assign(rolimonData, response.data.items || {});
                }
            } catch {}

            const collectibles = [];
            let cursor = null;
            let pageCount = 0;
            const maxPages = 5;

            do {
                const response = await new Promise((resolve) => {
                    try {
                        chrome.runtime.sendMessage({
                            action: "fetchUserInventory",
                            userId: userId,
                            cursor: cursor
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                resolve({ success: false, error: chrome.runtime.lastError.message });
                            } else {
                                resolve(response);
                            }
                        });
                    } catch (error) {
                        resolve({ success: false, error: error.message });
                    }
                });

                if (!response?.success) {
                    throw new Error(response?.error || 'Unknown error');
                }

                const data = response.data;
                if (data.data?.length > 0) {
                    const pageItems = data.data.map(item => {
                        const rolimonItem = Object.values(rolimonData).find(r => r[0] === item.name);
                        const rap = rolimonItem ? rolimonItem[2] : (item.recentAveragePrice || 1000);
                        const value = rolimonItem ? rolimonItem[4] : (item.recentAveragePrice || 1000);

                        return {
                            name: item.name,
                            id: item.assetId,
                            value: value,
                            rap: rap,
                            serialNumber: item.serialNumber || null,
                            userAssetId: item.userAssetId || null,
                            isOnHold: item.isOnHold || false,
                            copies: 1,
                            rarity: value > 50000 ? 'legendary' : value > 10000 ? 'rare' : 'common'
                        };
                    });
                    collectibles.push(...pageItems);
                }

                cursor = data.nextPageCursor;
                pageCount++;

                if (cursor && pageCount < maxPages) {
                    await Utils.delay(200);
                }
            } while (cursor && pageCount < maxPages);

            return collectibles;
        } catch {
            return [];
        }
    }

    async function fetchCommonOwners(itemIds, maxOwnerDays, lastOnlineDays) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({
                    action: 'fetchCommonOwners',
                    itemIds: itemIds,
                    maxOwnerDays: maxOwnerDays,
                    lastOnlineDays: lastOnlineDays
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve([]);
                    } else {
                        resolve(response?.success ? (response.data.owners || []) : []);
                    }
                });
            } catch (error) {
                resolve([]);
            }
        });
    }

    async function fetchPlayerAssets(userIds) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({
                    action: "fetchPlayerAssets",
                    userIds: userIds
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve(null);
                    } else {
                        resolve(response?.success ? response.data : null);
                    }
                });
            } catch (error) {
                resolve(null);
            }
        });
    }

    async function fetchUsernames(userIds) {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return [];
        }

        const url = `https://users.roblox.com/v1/users?userIds=${userIds.join(',')}`;
        const result = await Utils.safeFetch(url, { timeout: 8000, retries: 2 });
        
        if (!result.ok) {
            Utils.Logger.log('fetch_usernames_failed', { error: result.error?.message, userIds: userIds.length });
            return [];
        }

        const users = Utils.ensureArray(result.data?.data, []);
        return users.map(user => ({
            id: Utils.ensureNumber(user.id, 0),
            name: Utils.ensureString(user.name, ''),
            displayName: Utils.ensureString(user.displayName, user.name || '')
        }));
    }

    window.API = {
        fetchRolimons,
        getCurrentUserId,
        getCurrentUserIdSync,
        clearUserIdCache,
        getUserCollectibles,
        fetchCommonOwners,
        fetchPlayerAssets,
        fetchUsernames
    };
})();
