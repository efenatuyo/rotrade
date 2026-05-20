(function () {
    'use strict';
    async function loadRolimonsData() {
        return API.fetchRolimons();
    }
    function getCurrentUserId() {
        return API.getCurrentUserIdSync ? API.getCurrentUserIdSync() : null;
    }
    async function getCurrentUserIdAsync() {
        return API.getCurrentUserId ? await API.getCurrentUserId() : null;
    }
    async function getUserCollectibles(userId) {
        return API.getUserCollectibles(userId);
    }
    async function loadInventoryData() {
        try {
            const userId = getCurrentUserId() || (await getCurrentUserIdAsync());
            if (!userId) {
                const limiteds = await loadRolimonsData();
                displayInventory(limiteds.slice(0, 50));
                return;
            }
            const userInventory = await getUserCollectibles(userId);
            if (userInventory.length === 0) {
                const limiteds = await loadRolimonsData();
                displayInventory(limiteds.slice(0, 50));
                return;
            }
            displayInventory(userInventory);
        } catch (error) {
            const limiteds = await loadRolimonsData();
            displayInventory(limiteds.slice(0, 50));
        }
    }
    async function loadCatalogData() {
        try {
            const limiteds = await loadRolimonsData();
            if (limiteds.length > 0) {
                displayCatalog(limiteds);
            }
        } catch (error) {}
    }
    function displayInventory(items) {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        if (grid._inventoryClickHandler) {
            grid.removeEventListener('click', grid._inventoryClickHandler);
        }
        const sAttr = window.SecurityUtils
            ? window.SecurityUtils.sanitizeAttribute
            : (v) =>
                  String(v ?? '')
                      .replace(/&/g, '&amp;')
                      .replace(/"/g, '&quot;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
        const sHtml = window.SecurityUtils
            ? window.SecurityUtils.sanitizeHtml
            : (v) => {
                  const d = document.createElement('div');
                  d.textContent = String(v ?? '');
                  return d.innerHTML;
              };
        grid.innerHTML = items
            .map((item, index) => {
                const name = sAttr(item.name);
                const nameText = sHtml(item.name);
                const initials = sHtml(String(item.name || '').substring(0, 3).toUpperCase());
                return `
            <div class="item-card ${item.isOnHold ? 'on-hold' : ''}" data-item="${name}" data-value="${sAttr(item.value)}" data-rap="${sAttr(item.rap)}" data-id="${sAttr(item.id)}" data-index="${index}" data-type="inventory" data-on-hold="${item.isOnHold || false}">
                <div class="item-image">
                    <div style="width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 11px; color: rgb(255, 255, 255); font-weight: 600; display: flex; background: #2a2d30; border-radius: 4px;">
                        ${initials}
                    </div>
                </div>
                ${item.isOnHold ? '<div class="hold-indicator">🕒</div>' : ''}
                <div class="item-name" title="${name}">${nameText}</div>
                <div class="item-pricing">
                    <div class="item-value rap-text">RAP ${item.rap.toLocaleString()}</div>
                    <div class="item-rap val-text">VAL ${item.value.toLocaleString()}</div>
                </div>
            </div>
        `;
            })
            .join('');
        grid._inventoryClickHandler = function (e) {
            const itemCard = e.target.closest('.item-card');
            if (itemCard && itemCard.dataset.type === 'inventory') {
                if (itemCard.dataset.onHold === 'true') {
                    return;
                }
                const isSelected = itemCard.classList.contains('selected');
                if (isSelected) {
                    itemCard.classList.remove('selected');
                    itemCard.style.removeProperty('--quantity-number');
                } else {
                    const selectedItems = grid.querySelectorAll('.item-card.selected');
                    if (selectedItems.length >= 4) {
                        Dialogs.alert(
                            'Too Many Items',
                            'You can only select up to 4 items from your inventory.',
                            'error'
                        );
                        return;
                    }
                    itemCard.classList.add('selected');
                    itemCard.style.setProperty('--quantity-number', '"1"');
                }
                if (window.updateTradeSummaryGlobalImmediate) {
                    window.updateTradeSummaryGlobalImmediate();
                } else if (window.updateTradeSummaryGlobal) {
                    window.updateTradeSummaryGlobal();
                } else if (window.TradeSummary && window.TradeSummary.updateTradeSummaryInternal) {
                    window.TradeSummary.updateTradeSummaryInternal();
                }
            }
        };
        grid.addEventListener('click', grid._inventoryClickHandler);
        loadActualThumbnails('inventory-grid', items);
    }
    function displayCatalog(items) {
        const grid = document.getElementById('catalog-grid');
        if (!grid) return;
        if (grid._catalogClickHandler) {
            grid.removeEventListener('click', grid._catalogClickHandler);
        }
        const sAttr = window.SecurityUtils
            ? window.SecurityUtils.sanitizeAttribute
            : (v) =>
                  String(v ?? '')
                      .replace(/&/g, '&amp;')
                      .replace(/"/g, '&quot;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
        const sHtml = window.SecurityUtils
            ? window.SecurityUtils.sanitizeHtml
            : (v) => {
                  const d = document.createElement('div');
                  d.textContent = String(v ?? '');
                  return d.innerHTML;
              };
        grid.innerHTML = items
            .map((item, index) => {
                const name = sAttr(item.name);
                const nameText = sHtml(item.name);
                const initials = sHtml(String(item.name || '').substring(0, 3).toUpperCase());
                return `
            <div class="item-card" data-item="${name}" data-value="${sAttr(item.value)}" data-rap="${sAttr(item.rap)}" data-id="${sAttr(item.id)}" data-index="${index}" data-type="catalog" data-quantity="0">
                <div class="item-image">
                    <div style="width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 11px; color: rgb(255, 255, 255); font-weight: 600; display: flex; background: #2a2d30; border-radius: 4px;">
                        ${initials}
                    </div>
                </div>
                <div class="item-name" title="${name}">${nameText}</div>
                <div class="item-pricing">
                    <div class="item-value rap-text">RAP ${item.rap.toLocaleString()}</div>
                    <div class="item-rap val-text">VAL ${item.value.toLocaleString()}</div>
                </div>
            </div>
        `;
            })
            .join('');
        grid._catalogClickHandler = function (e) {
            const itemCard = e.target.closest('.item-card');
            if (itemCard && itemCard.dataset.type === 'catalog') {
                const currentQuantity = parseInt(itemCard.getAttribute('data-quantity')) || 0;
                const nextQuantity = (currentQuantity + 1) % 5;
                itemCard.setAttribute('data-quantity', nextQuantity.toString());
                itemCard.dataset.quantity = nextQuantity.toString();
                if (nextQuantity === 0) {
                    itemCard.classList.remove('selected');
                    itemCard.style.removeProperty('--quantity-number');
                } else {
                    itemCard.classList.add('selected');
                    itemCard.style.setProperty('--quantity-number', `"${nextQuantity}"`);
                }
                if (window.updateTradeSummaryGlobalImmediate) {
                    window.updateTradeSummaryGlobalImmediate();
                } else if (window.updateTradeSummaryGlobal) {
                    window.updateTradeSummaryGlobal();
                } else if (window.TradeSummary && window.TradeSummary.updateTradeSummaryInternal) {
                    window.TradeSummary.updateTradeSummaryInternal();
                } else if (window.TradeSummary && window.TradeSummary.updateTradeSummary) {
                    window.TradeSummary.updateTradeSummary();
                }
            }
        };
        grid.addEventListener('click', grid._catalogClickHandler);
        loadActualThumbnails('catalog-grid', items);
    }
    function updateCatalogVisual(catalogItem, newQuantity) {
        catalogItem.setAttribute('data-quantity', newQuantity.toString());
        catalogItem.dataset.quantity = newQuantity.toString();
        if (newQuantity === 0) {
            catalogItem.classList.remove('selected');
            catalogItem.style.removeProperty('--quantity-number');
        } else {
            catalogItem.classList.add('selected');
            catalogItem.style.setProperty('--quantity-number', `"${newQuantity}"`);
        }
    }
    function isCreateTradePage() {
        return document.body.classList.contains('path-auto-trades-create');
    }
    function loadActualThumbnails(gridId, items) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        if (grid._thumbLazyObserver) {
            try {
                grid._thumbLazyObserver.disconnect();
            } catch (e) {}
            grid._thumbLazyObserver = null;
        }
        if (isCreateTradePage()) {
            loadThumbnailsVisibleLazy(grid);
            return;
        }
        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        batches.forEach((batch, batchIndex) => {
            Utils.delay(batchIndex * 300).then(() => {
                processThumbnailBatch(batch, batchIndex + 1, batches.length, grid);
            });
        });
    }
    function loadThumbnailsVisibleLazy(grid) {
        const pendingIds = new Set();
        let flushTimer = null;
        const FLUSH_MS = 80;
        function flushPending() {
            flushTimer = null;
            const ids = [...pendingIds];
            pendingIds.clear();
            if (ids.length === 0) {
                return;
            }
            Thumbnails.fetchBatch(ids)
                .then((data) => {
                    if (data.data && data.data.length > 0) {
                        data.data.forEach((thumb) => {
                            if (thumb.imageUrl && thumb.state === 'Completed') {
                                updateThumbnailInRealTime(grid, thumb.targetId, thumb.imageUrl);
                            }
                        });
                    }
                })
                .catch(() => {});
        }
        function scheduleFlush() {
            if (flushTimer) {
                clearTimeout(flushTimer);
            }
            flushTimer = setTimeout(flushPending, FLUSH_MS);
        }
        const viewportH =
            typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 800;
        const io = new IntersectionObserver(
            (entries) => {
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    if (!entry.isIntersecting) {
                        continue;
                    }
                    const card = entry.target;
                    if (card.dataset.thumbLazyLoaded === '1') {
                        continue;
                    }
                    card.dataset.thumbLazyLoaded = '1';
                    io.unobserve(card);
                    const id = card.dataset.id;
                    if (!id) {
                        continue;
                    }
                    pendingIds.add(String(id));
                    scheduleFlush();
                }
            },
            {
                root: null,
                rootMargin: `${viewportH}px 0px ${viewportH}px 0px`,
                threshold: 0.01,
            }
        );
        grid.querySelectorAll('.item-card').forEach((card) => {
            card.dataset.thumbLazyLoaded = '';
            io.observe(card);
        });
        grid._thumbLazyObserver = io;
    }
    function processThumbnailBatch(items, batchNumber, totalBatches, grid) {
        const itemIds = items.map((item) => item.id);
        Thumbnails.fetchBatch(itemIds)
            .then((data) => {
                if (data.data && data.data.length > 0) {
                    data.data.forEach((thumb) => {
                        if (thumb.imageUrl && thumb.state === 'Completed') {
                            updateThumbnailInRealTime(grid, thumb.targetId, thumb.imageUrl);
                        }
                    });
                }
            })
            .catch(() => {});
    }
    function updateThumbnailInRealTime(grid, itemId, imageUrl) {
        const cards = grid.querySelectorAll(`[data-id="${itemId}"]`);
        cards.forEach((card) => {
            let imageContainer = card.querySelector('.item-image');
            if (!imageContainer) {
                imageContainer = card.querySelector('.item-icon');
            }
            if (imageContainer) {
                const idStr = String(itemId);
                imageContainer.innerHTML =
                    window.Thumbnails && window.Thumbnails.thumbnailImgHtml
                        ? window.Thumbnails.thumbnailImgHtml(imageUrl, idStr)
                        : `<img src="${imageUrl}" alt="Item Thumbnail" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block;">`;
                if (window.Thumbnails && window.Thumbnails.bindThumbnailErrorHandlers) {
                    window.Thumbnails.bindThumbnailErrorHandlers(imageContainer);
                }
            }
        });
    }
    const filterInventory = Utils.throttle((query) => {
        const items = document.querySelectorAll('#inventory-grid .item-card');
        items.forEach((item) => {
            const itemName = item.dataset.item.toLowerCase();
            const matches = itemName.includes(query.toLowerCase());
            item.style.display = matches ? '' : 'none';
        });
    }, 150);
    const filterCatalog = Utils.throttle((query) => {
        const items = document.querySelectorAll('#catalog-grid .item-card');
        items.forEach((item) => {
            const itemName = item.dataset.item.toLowerCase();
            const matches = itemName.includes(query.toLowerCase());
            item.style.display = matches ? '' : 'none';
        });
    }, 150);
    window.Inventory = {
        loadInventoryData: loadInventoryData,
        loadCatalogData: loadCatalogData,
        displayInventory: displayInventory,
        displayCatalog: displayCatalog,
        updateCatalogVisual: updateCatalogVisual,
        loadActualThumbnails: loadActualThumbnails,
        filterInventory: filterInventory,
        filterCatalog: filterCatalog,
        loadRolimonsData: loadRolimonsData,
        getCurrentUserId: getCurrentUserId,
        getCurrentUserIdAsync: getCurrentUserIdAsync,
        getUserCollectibles: getUserCollectibles,
    };
})();
