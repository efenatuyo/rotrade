(function () {
    'use strict';
    const cache = window.thumbnailCache || {};
    const pendingRequests = new Map();
    const cacheGeneration = {};
    const BATCH_SIZE = 100;
    const BATCH_DELAY = 50;
    const IMG_STYLE =
        'width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block;';
    function escapeHtmlAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
    function thumbnailImgHtml(imageUrl, itemIdStr, fallbackText) {
        const raw =
            (typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeUrl
                ? SecurityUtils.sanitizeUrl(imageUrl)
                : imageUrl) || imageUrl;
        const safeUrl = escapeHtmlAttr(raw);
        const safeId = escapeHtmlAttr(itemIdStr);
        const fb =
            fallbackText != null && fallbackText !== ''
                ? ` data-thumb-fallback="${escapeHtmlAttr(fallbackText)}"`
                : '';
        return `<img src="${safeUrl}" data-thumb-item-id="${safeId}"${fb} style="${IMG_STYLE}" alt="">`;
    }
    function bindThumbnailErrorHandlers(root) {
        if (!root || !root.querySelectorAll) {
            return;
        }
        const imgs = root.querySelectorAll('img[data-thumb-item-id]');
        for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i];
            if (img.dataset.thumbErrBound === '1') {
                continue;
            }
            img.dataset.thumbErrBound = '1';
            img.addEventListener('error', function () {
                handleImageError(img);
            });
        }
    }
    function bustCdnImageUrl(url) {
        if (!url || typeof url !== 'string') {
            return url;
        }
        const sep = url.indexOf('?') >= 0 ? '&' : '?';
        return `${url}${sep}rotrade_tt=${Date.now()}`;
    }
    function invalidateCached(itemId) {
        invalidateCachedBatch([itemId]);
    }
    function invalidateCachedBatch(itemIds) {
        if (!itemIds || itemIds.length === 0) {
            return;
        }
        for (let i = 0; i < itemIds.length; i++) {
            const itemIdStr = String(itemIds[i]).trim();
            if (!itemIdStr) {
                continue;
            }
            cacheGeneration[itemIdStr] = (cacheGeneration[itemIdStr] || 0) + 1;
            delete cache[itemIdStr];
            if (window.thumbnailCache) {
                delete window.thumbnailCache[itemIdStr];
            }
            pendingRequests.delete(itemIdStr);
            localStorageWriteQueue.delete(itemIdStr);
        }
        try {
            const currentCache = {
                ...cache,
                ...window.thumbnailCache,
            };
            localStorage.setItem('thumbnailCache', JSON.stringify(currentCache));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                try {
                    localStorage.removeItem('thumbnailCache');
                    const currentCache = {
                        ...cache,
                        ...window.thumbnailCache,
                    };
                    localStorage.setItem('thumbnailCache', JSON.stringify(currentCache));
                } catch {}
            }
        }
    }
    const invalidThumbQueue = new Set();
    let invalidFlushTimer = null;
    const INVALID_FLUSH_DELAY = 50;
    function queueInvalidThumbnail(itemIdStr, img) {
        if (img.dataset.thumbInvalidQueued === '1') {
            return;
        }
        img.dataset.thumbInvalidQueued = '1';
        invalidThumbQueue.add(itemIdStr);
        if (!invalidFlushTimer) {
            invalidFlushTimer = setTimeout(flushInvalidThumbnailQueue, INVALID_FLUSH_DELAY);
        }
    }
    function flushInvalidThumbnailQueue() {
        invalidFlushTimer = null;
        const ids = [...invalidThumbQueue];
        invalidThumbQueue.clear();
        if (ids.length === 0) {
            return;
        }
        invalidateCachedBatch(ids);
        const batches = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            batches.push(ids.slice(i, i + BATCH_SIZE));
        }
        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];
            fetchThumbnailBatchNetworkOnly(batch)
                .then((merged) => {
                    const urlById = new Map();
                    for (let i = 0; i < merged.length; i++) {
                        const item = merged[i];
                        if (
                            item &&
                            item.targetId != null &&
                            item.imageUrl &&
                            item.state === 'Completed'
                        ) {
                            urlById.set(String(item.targetId).trim(), item.imageUrl);
                        }
                    }
                    for (let j = 0; j < batch.length; j++) {
                        const id = batch[j];
                        const newUrl = urlById.get(id);
                        if (newUrl) {
                            applyRefreshedThumbnailUrl(id, newUrl);
                        } else {
                            document
                                .querySelectorAll(`img[data-thumb-item-id="${id}"]`)
                                .forEach((img) => {
                                    img.dataset.thumbInvalidQueued = '';
                                    img.dataset.thumbRetry = '1';
                                    applyThumbFallback(img);
                                });
                        }
                    }
                })
                .catch(() => {
                    for (let j = 0; j < batch.length; j++) {
                        const id = batch[j];
                        document
                            .querySelectorAll(`img[data-thumb-item-id="${id}"]`)
                            .forEach((img) => {
                                img.dataset.thumbInvalidQueued = '';
                                img.dataset.thumbRetry = '1';
                                applyThumbFallback(img);
                            });
                    }
                });
        }
    }
    function applyRefreshedThumbnailUrl(itemIdStr, rawUrl) {
        const url =
            typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeUrl
                ? SecurityUtils.sanitizeUrl(rawUrl)
                : rawUrl;
        if (!url) {
            document.querySelectorAll(`img[data-thumb-item-id="${itemIdStr}"]`).forEach((img) => {
                img.dataset.thumbInvalidQueued = '';
                img.dataset.thumbRetry = '1';
                applyThumbFallback(img);
            });
            return;
        }
        const busted = bustCdnImageUrl(url);
        document.querySelectorAll(`img[data-thumb-item-id="${itemIdStr}"]`).forEach((img) => {
            img.dataset.thumbInvalidQueued = '';
            img.dataset.thumbRetry = '1';
            img.removeAttribute('src');
            img.src = busted;
        });
    }
    function fetchThumbnailBatchNetworkOnly(batch) {
        const batchStartGens = {};
        for (let g = 0; g < batch.length; g++) {
            const bid = String(batch[g]);
            batchStartGens[bid] = cacheGeneration[bid] || 0;
        }
        const ids = batch.join(',');
        const bust = `&_=${Date.now()}`;
        return fetch(
            `https://thumbnails.roblox.com/v1/assets?assetIds=${ids}&size=150x150&format=Png&isCircular=false${bust}`,
            {
                cache: 'no-store',
            }
        )
            .then((response) => {
                if (!response.ok) {
                    return [];
                }
                return response.json();
            })
            .then((data) => {
                if (!data || !Array.isArray(data.data)) {
                    return [];
                }
                for (let i = 0; i < data.data.length; i++) {
                    const item = data.data[i];
                    if (item && item.imageUrl && item.state === 'Completed' && item.targetId) {
                        const tid = String(item.targetId);
                        if ((cacheGeneration[tid] || 0) !== (batchStartGens[tid] || 0)) {
                            continue;
                        }
                        setCached(tid, item.imageUrl);
                    }
                }
                return data.data;
            })
            .catch(() => []);
    }
    function applyThumbFallback(img) {
        const fb = img.getAttribute('data-thumb-fallback');
        if (fb != null && fb !== '' && img.parentElement) {
            img.parentElement.textContent = fb;
        }
    }
    function handleImageError(img) {
        if (!img) {
            return;
        }
        const itemIdStr = img.getAttribute('data-thumb-item-id');
        if (!itemIdStr) {
            return;
        }
        if (img.dataset.thumbRetry === '1') {
            applyThumbFallback(img);
            return;
        }
        queueInvalidThumbnail(itemIdStr, img);
    }
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
            const currentCache = {
                ...cache,
                ...window.thumbnailCache,
            };
            for (const [key, value] of localStorageWriteQueue) {
                currentCache[key] = value;
            }
            localStorage.setItem('thumbnailCache', JSON.stringify(currentCache));
            localStorageWriteQueue.clear();
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                try {
                    localStorage.removeItem('thumbnailCache');
                    const currentCache = {
                        ...cache,
                        ...window.thumbnailCache,
                    };
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
    function fetchThumbnail(itemId, options) {
        const forceRefresh = options && options.forceRefresh;
        const itemIdStr = String(itemId).trim();
        const cachedUrl = cache[itemIdStr] || window.thumbnailCache?.[itemIdStr];
        if (cachedUrl && !forceRefresh) {
            return Promise.resolve({
                data: [
                    {
                        targetId: itemId,
                        state: 'Completed',
                        imageUrl: cachedUrl,
                    },
                ],
            });
        }
        if (pendingRequests.has(itemIdStr) && !forceRefresh) {
            return pendingRequests.get(itemIdStr);
        }
        if (forceRefresh) {
            pendingRequests.delete(itemIdStr);
        }
        const promise = (async () => {
            const genAtStart = cacheGeneration[itemIdStr] || 0;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1e4);
                const bust = forceRefresh ? `&_=${Date.now()}` : '';
                const response = await fetch(
                    `https://thumbnails.roblox.com/v1/assets?assetIds=${itemIdStr}&size=150x150&format=Png&isCircular=false${bust}`,
                    {
                        signal: controller.signal,
                        cache: forceRefresh ? 'no-store' : 'default',
                    }
                );
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const data = await response.json();
                if ((cacheGeneration[itemIdStr] || 0) !== genAtStart) {
                    pendingRequests.delete(itemIdStr);
                    return data;
                }
                if (data && Array.isArray(data.data) && data.data[0]?.imageUrl) {
                    const imageUrl = SecurityUtils?.sanitizeUrl(data.data[0].imageUrl);
                    if (imageUrl) {
                        setCached(itemIdStr, imageUrl);
                    }
                }
                pendingRequests.delete(itemIdStr);
                return data;
            } catch (error) {
                pendingRequests.delete(itemIdStr);
                if (window.Utils && window.Utils.Logger) {
                    window.Utils.Logger.log('fetch_thumbnail_failed', {
                        itemId: itemIdStr,
                        error: error.message,
                    });
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
                    imageUrl: cachedUrl,
                });
            } else {
                uncachedIds.push(id);
            }
        }
        if (uncachedIds.length === 0) {
            return Promise.resolve({
                data: cached,
            });
        }
        const batches = [];
        for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
            batches.push(uncachedIds.slice(i, i + BATCH_SIZE));
        }
        const promises = batches.map(async (batch) => {
            const batchStartGens = {};
            for (let g = 0; g < batch.length; g++) {
                const bid = String(batch[g]);
                batchStartGens[bid] = cacheGeneration[bid] || 0;
            }
            const ids = batch.join(',');
            try {
                const response = await fetch(
                    `https://thumbnails.roblox.com/v1/assets?assetIds=${ids}&size=150x150&format=Png&isCircular=false`
                );
                if (!response.ok) {
                    return [];
                }
                const data = await response.json();
                if (Array.isArray(data.data)) {
                    for (let i = 0; i < data.data.length; i++) {
                        const item = data.data[i];
                        if (item && item.imageUrl && item.state === 'Completed' && item.targetId) {
                            const tid = String(item.targetId);
                            if ((cacheGeneration[tid] || 0) !== (batchStartGens[tid] || 0)) {
                                continue;
                            }
                            setCached(tid, item.imageUrl);
                        }
                    }
                    return data.data;
                }
                return [];
            } catch (error) {
                if (window.Utils && window.Utils.Logger) {
                    window.Utils.Logger.log('fetch_thumbnail_batch_failed', {
                        batchSize: batch.length,
                        error: error.message,
                    });
                }
                return [];
            }
        });
        return Promise.all(promises).then((results) => ({
            data: [...cached, ...results.flat()],
        }));
    }
    function loadForElements(elements) {
        if (!elements || elements.length === 0) return;
        const itemsToLoad = [];
        const elementMap = new Map();
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const itemId =
                element.dataset.id ||
                element.dataset.itemId ||
                element.getAttribute('data-id') ||
                element.getAttribute('data-item-id');
            if (!itemId || itemId === '' || itemId === 'undefined' || itemId === 'null') continue;
            const itemIdStr = String(itemId).trim();
            const cachedUrl =
                cache[itemIdStr] || (window.thumbnailCache && window.thumbnailCache[itemIdStr]);
            if (cachedUrl) {
                if (
                    element.classList.contains('item-icon') ||
                    element.classList.contains('item-image')
                ) {
                    element.innerHTML = thumbnailImgHtml(cachedUrl, itemIdStr);
                    bindThumbnailErrorHandlers(element);
                } else {
                    const container = element.querySelector('.item-image, .item-icon') || element;
                    if (container) {
                        container.innerHTML = thumbnailImgHtml(cachedUrl, itemIdStr);
                        bindThumbnailErrorHandlers(container);
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
            const uniqueIds = [...new Set(itemsToLoad)].filter((id) => id && !isNaN(id));
            if (uniqueIds.length > 0) {
                fetchBatch(uniqueIds)
                    .then((data) => {
                        if (data && data.data) {
                            for (let i = 0; i < data.data.length; i++) {
                                const item = data.data[i];
                                if (item && item.imageUrl && item.state === 'Completed') {
                                    const itemIdStr = String(item.targetId).trim();
                                    const elements = elementMap.get(itemIdStr) || [];
                                    for (let j = 0; j < elements.length; j++) {
                                        const element = elements[j];
                                        if (
                                            element.classList.contains('item-icon') ||
                                            element.classList.contains('item-image')
                                        ) {
                                            element.innerHTML = thumbnailImgHtml(
                                                item.imageUrl,
                                                itemIdStr
                                            );
                                            bindThumbnailErrorHandlers(element);
                                        } else {
                                            const container =
                                                element.querySelector('.item-image, .item-icon') ||
                                                element;
                                            if (container) {
                                                container.innerHTML = thumbnailImgHtml(
                                                    item.imageUrl,
                                                    itemIdStr
                                                );
                                                bindThumbnailErrorHandlers(container);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    })
                    .catch(() => {});
            }
        }
    }
    init();
    window.Thumbnails = {
        getCached: getCached,
        setCached: setCached,
        fetch: fetchThumbnail,
        fetchBatch: fetchBatch,
        loadForElements: loadForElements,
        thumbnailImgHtml: thumbnailImgHtml,
        bindThumbnailErrorHandlers: bindThumbnailErrorHandlers,
        invalidateCached: invalidateCached,
        invalidateCachedBatch: invalidateCachedBatch,
        handleImageError: handleImageError,
    };
})();
