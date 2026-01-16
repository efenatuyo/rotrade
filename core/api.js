(function() {
    'use strict';

    const rolimonsCache = { data: null, timestamp: 0, duration: 300000 };

    async function fetchRolimons() {
        const now = Date.now();
        if (rolimonsCache.data && (now - rolimonsCache.timestamp < rolimonsCache.duration)) {
            return Utils.ensureArray(rolimonsCache.data, []);
        }

        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "fetchRolimons" }, (response) => {
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
        });
    }

    async function getCurrentUserId() {
        try {
            if (window.location.href.includes('/users/')) {
                const match = window.location.href.match(/\/users\/(\d+)/);
                if (match) return parseInt(match[1]);
            }

            return new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: "fetchUserAuth" }, (response) => {
                    if (response?.success && response.data.id) {
                        resolve(response.data.id);
                    } else {
                        const elements = document.querySelectorAll('[data-userid]');
                        for (const el of elements) {
                            const id = el.getAttribute('data-userid');
                            if (id && id !== '0') {
                                resolve(parseInt(id));
                                return;
                            }
                        }
                        resolve(null);
                    }
                });
            });
        } catch {
            return null;
        }
    }

    async function getUserCollectibles(userId) {
        try {
            const rolimonData = {};
            try {
                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'fetchRolimons' }, resolve);
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
                    chrome.runtime.sendMessage({
                        action: "fetchUserInventory",
                        userId: userId,
                        cursor: cursor
                    }, resolve);
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
            chrome.runtime.sendMessage({
                action: 'fetchCommonOwners',
                itemIds: itemIds,
                maxOwnerDays: maxOwnerDays,
                lastOnlineDays: lastOnlineDays
            }, (response) => {
                resolve(response?.success ? (response.data.owners || []) : []);
            });
        });
    }

    async function fetchPlayerAssets(userIds) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: "fetchPlayerAssets",
                userIds: userIds
            }, (response) => {
                resolve(response?.success ? response.data : null);
            });
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
        getUserCollectibles,
        fetchCommonOwners,
        fetchPlayerAssets,
        fetchUsernames
    };
})();
