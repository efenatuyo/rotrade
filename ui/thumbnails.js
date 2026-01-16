(function() {
    'use strict';

    const cache = window.thumbnailCache || {};
    const pendingRequests = new Map();
    const BATCH_SIZE = 100;
    const BATCH_DELAY = 50;

    function init() {
        try {
            const stored = localStorage.getItem('thumbnailCache');
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.assign(cache, parsed);
            }
        } catch {}
        if (!window.thumbnailCache) {
            window.thumbnailCache = cache;
        } else {
            Object.assign(window.thumbnailCache, cache);
            Object.assign(cache, window.thumbnailCache);
        }
    }

    function getCached(itemId) {
        return cache[itemId] || null;
    }

    let localStorageWriteQueue = new Map();
    let localStorageWriteTimer = null;
    const LOCALSTORAGE_WRITE_DELAY = 500;

    function flushLocalStorageWrites() {
        if (localStorageWriteQueue.size === 0) return;
        
        try {
            const currentCache = { ...cache, ...window.thumbnailCache };
            for (const [key, value] of localStorageWriteQueue) {
                currentCache[key] = value;
            }
            localStorage.setItem('thumbnailCache', JSON.stringify(currentCache));
            localStorageWriteQueue.clear();
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                try {
                    localStorage.removeItem('thumbnailCache');
                    const currentCache = { ...cache, ...window.thumbnailCache };
                    localStorage.setItem('thumbnailCache', JSON.stringify(currentCache));
                    localStorageWriteQueue.clear();
                } catch {}
            }
        }
        localStorageWriteTimer = null;
    }

    function setCached(itemId, url) {
        cache[itemId] = url;
        window.thumbnailCache[itemId] = url;
        localStorageWriteQueue.set(itemId, url);
        
        if (!localStorageWriteTimer) {
            localStorageWriteTimer = setTimeout(flushLocalStorageWrites, LOCALSTORAGE_WRITE_DELAY);
        }
    }

    function fetchThumbnail(itemId) {
        const itemIdStr = String(itemId).trim();
        const cachedUrl = cache[itemIdStr] || window.thumbnailCache?.[itemIdStr];
        if (cachedUrl) {
            return Promise.resolve({
                data: [{
                    targetId: itemId,
                    state: 'Completed',
                    imageUrl: cachedUrl
                }]
            });
        }

        if (pendingRequests.has(itemIdStr)) {
            return pendingRequests.get(itemIdStr);
        }

        const promise = (async () => {
            try {
                const response = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${itemIdStr}&size=150x150&format=Png&isCircular=false`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const data = await response.json();
                
                if (data && Array.isArray(data.data) && data.data[0]?.imageUrl) {
                    setCached(itemIdStr, data.data[0].imageUrl);
                }
                pendingRequests.delete(itemIdStr);
                return data;
            } catch (error) {
                pendingRequests.delete(itemIdStr);
                if (window.Utils && window.Utils.Logger) {
                    window.Utils.Logger.log('fetch_thumbnail_failed', { itemId: itemIdStr, error: error.message });
                }
                throw error;
            }
        })();

        pendingRequests.set(itemIdStr, promise);
        return promise;
    }

    function fetchBatch(itemIds) {
        const cached = [];
        const uncachedIds = [];

        for (let i = 0; i < itemIds.length; i++) {
            const id = itemIds[i];
            const cachedUrl = cache[id] || window.thumbnailCache?.[id];
            if (cachedUrl) {
                cached.push({
                    targetId: id,
                    state: 'Completed',
                    imageUrl: cachedUrl
                });
            } else {
                uncachedIds.push(id);
            }
        }

        if (uncachedIds.length === 0) {
            return Promise.resolve({ data: cached });
        }

        const batches = [];
        for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
            batches.push(uncachedIds.slice(i, i + BATCH_SIZE));
        }

        const promises = batches.map(async batch => {
            const ids = batch.join(',');
            try {
                const response = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${ids}&size=150x150&format=Png&isCircular=false`);
                if (!response.ok) {
                    return [];
                }
                const data = await response.json();
                
                if (Array.isArray(data.data)) {
                    for (let i = 0; i < data.data.length; i++) {
                        const item = data.data[i];
                        if (item && item.imageUrl && item.state === 'Completed' && item.targetId) {
                            setCached(String(item.targetId), item.imageUrl);
                        }
                    }
                    return data.data;
                }
                return [];
            } catch (error) {
                if (window.Utils && window.Utils.Logger) {
                    window.Utils.Logger.log('fetch_thumbnail_batch_failed', { batchSize: batch.length, error: error.message });
                }
                return [];
            }
        });

        return Promise.all(promises).then(results => {
            return { data: [...cached, ...results.flat()] };
        });
    }

    function loadForElements(elements) {
        if (!elements || elements.length === 0) return;

        const itemsToLoad = [];
        const elementMap = new Map();

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const itemId = element.dataset.id || element.dataset.itemId || element.getAttribute('data-id') || element.getAttribute('data-item-id');
            if (!itemId || itemId === '' || itemId === 'undefined' || itemId === 'null') continue;

            const itemIdStr = String(itemId).trim();
            const cachedUrl = cache[itemIdStr] || (window.thumbnailCache && window.thumbnailCache[itemIdStr]);
            
            if (cachedUrl) {
                if (element.classList.contains('item-icon') || element.classList.contains('item-image')) {
                    element.innerHTML = `<img src="${cachedUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block;">`;
                } else {
                    const container = element.querySelector('.item-image, .item-icon') || element;
                    if (container) {
                        container.innerHTML = `<img src="${cachedUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block;">`;
                    }
                }
            } else {
                itemsToLoad.push(itemIdStr);
                if (!elementMap.has(itemIdStr)) {
                    elementMap.set(itemIdStr, []);
                }
                elementMap.get(itemIdStr).push(element);
            }
        }

        if (itemsToLoad.length > 0) {
            const uniqueIds = [...new Set(itemsToLoad)].filter(id => id && !isNaN(id));
            if (uniqueIds.length > 0) {
                fetchBatch(uniqueIds).then(data => {
                    if (data && data.data) {
                        for (let i = 0; i < data.data.length; i++) {
                            const item = data.data[i];
                            if (item && item.imageUrl && item.state === 'Completed') {
                                const itemIdStr = String(item.targetId).trim();
                                const elements = elementMap.get(itemIdStr) || [];
                                for (let j = 0; j < elements.length; j++) {
                                    const element = elements[j];
                                    if (element.classList.contains('item-icon') || element.classList.contains('item-image')) {
                                        element.innerHTML = `<img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block;">`;
                                    } else {
                                        const container = element.querySelector('.item-image, .item-icon') || element;
                                        if (container) {
                                            container.innerHTML = `<img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block;">`;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }).catch(error => {
                    console.error('Error fetching thumbnails:', error);
                });
            }
        }
    }

    init();

    window.Thumbnails = {
        getCached,
        setCached,
        fetch: fetchThumbnail,
        fetchBatch,
        loadForElements
    };
})();
