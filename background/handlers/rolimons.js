const ROLIMONS_STORAGE_DATA_KEY = 'rolimonsItemsData';

const ROLIMONS_STORAGE_TIME_KEY = 'rolimonsItemsFetchedAt';

function persistRolimonsToStorage(data, timestamp) {
    return chrome.storage.local
        .set({
            [ROLIMONS_STORAGE_DATA_KEY]: data,
            [ROLIMONS_STORAGE_TIME_KEY]: timestamp,
        })
        .catch(function () {});
}

async function loadRolimonsFromStorage() {
    try {
        const result = await chrome.storage.local.get([
            ROLIMONS_STORAGE_DATA_KEY,
            ROLIMONS_STORAGE_TIME_KEY,
        ]);
        return {
            data: result[ROLIMONS_STORAGE_DATA_KEY] || null,
            fetchedAt: result[ROLIMONS_STORAGE_TIME_KEY] || 0,
        };
    } catch {
        return {
            data: null,
            fetchedAt: 0,
        };
    }
}

function handleFetchRolimons(_request, sendResponse) {
    const cacheEntry = rolimonsCache;
    const duration = cacheEntry.duration;
    const now = Date.now();
    (async function () {
        try {
            if (cacheEntry.data && now - cacheEntry.timestamp < duration) {
                sendResponse({
                    success: true,
                    data: cacheEntry.data,
                });
                return;
            }
            if (cacheEntry.promise) {
                const data = await cacheEntry.promise;
                sendResponse({
                    success: true,
                    data: data,
                });
                return;
            }
            const stored = await loadRolimonsFromStorage();
            if (
                stored.data &&
                typeof stored.data === 'object' &&
                stored.data.items &&
                stored.fetchedAt &&
                now - stored.fetchedAt < duration
            ) {
                cacheEntry.data = stored.data;
                cacheEntry.timestamp = stored.fetchedAt;
                sendResponse({
                    success: true,
                    data: cacheEntry.data,
                });
                return;
            }
            cacheEntry.promise = (async function () {
                try {
                    const response = await fetch('https://roautotrade.com/api/roblox/items');
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    if (!data || typeof data !== 'object' || !data.items) {
                        throw new Error('Invalid Roblox itemsdata format');
                    }
                    const ts = Date.now();
                    cacheEntry.data = data;
                    cacheEntry.timestamp = ts;
                    await persistRolimonsToStorage(data, ts);
                    return data;
                } catch (error) {
                    throw error;
                } finally {
                    cacheEntry.promise = null;
                }
            })();
            const data = await cacheEntry.promise;
            sendResponse({
                success: true,
                data: data,
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message || 'Failed to fetch Rolimons data',
            });
        }
    })();
    return true;
}
