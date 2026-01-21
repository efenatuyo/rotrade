(function() {
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
            const userId = getCurrentUserId() || await getCurrentUserIdAsync();
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
        } catch (error) {
        }
    }

    function displayInventory(items) {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;

        if (grid._inventoryClickHandler) {
            grid.removeEventListener('click', grid._inventoryClickHandler);
        }

        grid.innerHTML = items.map((item, index) => `
            <div class="item-card ${item.isOnHold ? 'on-hold' : ''}" data-item="${item.name}" data-value="${item.value}" data-rap="${item.rap}" data-id="${item.id}" data-index="${index}" data-type="inventory" data-on-hold="${item.isOnHold || false}">
                <div class="item-image">
                    <div style="width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 11px; color: rgb(255, 255, 255); font-weight: 600; display: flex; background: #2a2d30; border-radius: 4px;">
                        ${item.name.substring(0, 3).toUpperCase()}
                    </div>
                </div>
                ${item.isOnHold ? '<div class="hold-indicator">🕒</div>' : ''}
                <div class="item-name" title="${item.name}">${item.name}</div>
                <div class="item-pricing">
                    <div class="item-value rap-text">RAP ${item.rap.toLocaleString()}</div>
                    <div class="item-rap val-text">VAL ${item.value.toLocaleString()}</div>
                </div>
            </div>
        `).join('');

        // Create and store the click handler
        grid._inventoryClickHandler = function(e) {
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
                        Dialogs.alert('Too Many Items', 'You can only select up to 4 items from your inventory.', 'error');
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

        // Remove existing click handler if it exists
        if (grid._catalogClickHandler) {
            grid.removeEventListener('click', grid._catalogClickHandler);
        }

        grid.innerHTML = items.map((item, index) => `
            <div class="item-card" data-item="${item.name}" data-value="${item.value}" data-rap="${item.rap}" data-id="${item.id}" data-index="${index}" data-type="catalog" data-quantity="0">
                <div class="item-image">
                    <div style="width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 11px; color: rgb(255, 255, 255); font-weight: 600; display: flex; background: #2a2d30; border-radius: 4px;">
                        ${item.name.substring(0, 3).toUpperCase()}
                    </div>
                </div>
                <div class="item-name" title="${item.name}">${item.name}</div>
                <div class="item-pricing">
                    <div class="item-value rap-text">RAP ${item.rap.toLocaleString()}</div>
                    <div class="item-rap val-text">VAL ${item.value.toLocaleString()}</div>
                </div>
            </div>
        `).join('');

        // Create and store the click handler
        grid._catalogClickHandler = function(e) {
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

    function loadActualThumbnails(gridId, items) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

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

    function processThumbnailBatch(items, batchNumber, totalBatches, grid) {
        const itemIds = items.map(item => item.id);

        Thumbnails.fetchBatch(itemIds)
            .then(data => {
                if (data.data && data.data.length > 0) {
                    data.data.forEach(thumb => {
                        if (thumb.imageUrl && thumb.state === 'Completed') {
                            updateThumbnailInRealTime(grid, thumb.targetId, thumb.imageUrl);
                        }
                    });
                }
            })
            .catch(error => {
            });
    }

    function updateThumbnailInRealTime(grid, itemId, imageUrl) {
        const cards = grid.querySelectorAll(`[data-id="${itemId}"]`);

        cards.forEach((card, index) => {
            let imageContainer = card.querySelector('.item-image');
            if (!imageContainer) {
                imageContainer = card.querySelector('.item-icon');
            }

            if (imageContainer) {
                imageContainer.innerHTML = `<img src="${imageUrl}" alt="Item Thumbnail" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block;">`;
            }
        });
    }

    const filterInventory = Utils.throttle((query) => {
        const items = document.querySelectorAll('#inventory-grid .item-card');
        items.forEach(item => {
            const itemName = item.dataset.item.toLowerCase();
            const matches = itemName.includes(query.toLowerCase());
            item.style.display = matches ? '' : 'none';
        });
    }, 150);

    const filterCatalog = Utils.throttle((query) => {
        const items = document.querySelectorAll('#catalog-grid .item-card');
        items.forEach(item => {
            const itemName = item.dataset.item.toLowerCase();
            const matches = itemName.includes(query.toLowerCase());
            item.style.display = matches ? '' : 'none';
        });
    }, 150);

    window.Inventory = {
        loadInventoryData,
        loadCatalogData,
        displayInventory,
        displayCatalog,
        updateCatalogVisual,
        loadActualThumbnails,
        filterInventory,
        filterCatalog,
        loadRolimonsData,
        getCurrentUserId,
        getCurrentUserIdAsync,
        getUserCollectibles
    };
})();
