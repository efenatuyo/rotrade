(function() {
    'use strict';

    function checkForEditMode() {
        const editingTrade = Storage.get('editingTrade', null);
        if (!editingTrade) return;

        try {
            const tradeData = editingTrade;

            const pageTitle = document.querySelector('.auto-trades-title');
            if (pageTitle) {
                pageTitle.textContent = 'Edit Auto Trade';
            }

            const createButton = document.getElementById('create-auto-trade');
            if (createButton) {
                createButton.textContent = 'UPDATE AUTO TRADE';
                createButton.className = 'btn btn-success';
                createButton.style.background = '#28a745';
                createButton.style.borderColor = '#28a745';
            }

            const nameInput = document.getElementById('auto-trade-name') ||
                             document.getElementById('trade-name') ||
                             document.querySelector('input[placeholder*="trade name"]') ||
                             document.querySelector('input[placeholder*="Trade name"]') ||
                             document.querySelector('input[placeholder*="Enter your trade name"]') ||
                             document.querySelector('.trade-settings input[type="text"]');

            if (nameInput) {
                nameInput.value = tradeData.name;
                nameInput.placeholder = `Editing: ${tradeData.name}`;
            }

            if (tradeData.giving && tradeData.giving.length > 0) {
                const selectInventoryItems = () => {
                    const inventoryGrid = document.getElementById('inventory-grid');
                    if (!inventoryGrid || inventoryGrid.children.length === 0) {
                        requestAnimationFrame(selectInventoryItems);
                        return;
                    }

                    const itemCounts = {};
                    tradeData.giving.forEach(item => {
                        itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
                    });

                    Object.entries(itemCounts).forEach(([itemName, requiredCount]) => {
                        let inventoryCards = Array.from(document.querySelectorAll(`#inventory-grid [data-item="${itemName}"]`));

                        if (inventoryCards.length === 0) {
                            inventoryCards = Array.from(document.querySelectorAll(`#inventory-grid [title="${itemName}"]`));
                        }
                        if (inventoryCards.length === 0) {
                            inventoryCards = Array.from(document.querySelectorAll(`#inventory-grid [data-name="${itemName}"]`));
                        }

                        if (inventoryCards.length > 0) {
                            const availableCards = inventoryCards.filter(card => card.dataset.onHold !== 'true');
                            const countToSelect = Math.min(requiredCount, availableCards.length);

                            for (let i = 0; i < countToSelect; i++) {
                                const card = availableCards[i];
                                card.classList.add('selected');
                                card.style.setProperty('--quantity-number', '"1"');
                            }
                        }
                    });

                    if (window.updateTradeSummaryGlobal) {
                        window.updateTradeSummaryGlobal();
                    }

                    const selectedInventoryItems = document.querySelectorAll('#inventory-grid .item-card.selected');
                    if (selectedInventoryItems.length > 0 && window.loadThumbnailsForElements) {
                        window.loadThumbnailsForElements(selectedInventoryItems, '#inventory-grid');
                    }
                };

                requestAnimationFrame(() => {
                    selectInventoryItems();
                });
            }

            const targetItems = tradeData.getting || tradeData.receiving || [];
            if (targetItems && targetItems.length > 0) {
                const selectCatalogItems = () => {
                    const catalogGrid = document.getElementById('catalog-grid');
                    if (!catalogGrid || catalogGrid.children.length === 0) {
                        requestAnimationFrame(selectCatalogItems);
                        return;
                    }

                    const catalogItemCounts = {};
                    targetItems.forEach(item => {
                        catalogItemCounts[item.name] = (catalogItemCounts[item.name] || 0) + 1;
                    });

                    Object.entries(catalogItemCounts).forEach(([itemName, requiredCount]) => {
                        let catalogCard = document.querySelector(`#catalog-grid [data-item="${itemName}"]`) ||
                                        document.querySelector(`#catalog-grid [title="${itemName}"]`) ||
                                        document.querySelector(`#catalog-grid [data-name="${itemName}"]`);

                        if (catalogCard) {
                            catalogCard.dataset.quantity = Math.min(requiredCount, 4);
                            catalogCard.classList.add('selected');
                            catalogCard.style.setProperty('--quantity-number', `"${Math.min(requiredCount, 4)}"`);
                        }
                    });

                    if (window.updateTradeSummaryGlobal) {
                        window.updateTradeSummaryGlobal();
                    }

                    const selectedCatalogItems = document.querySelectorAll('#catalog-grid .item-card.selected');
                    if (selectedCatalogItems.length > 0 && window.loadThumbnailsForElements) {
                        window.loadThumbnailsForElements(selectedCatalogItems, '#catalog-grid');
                    }
                };

                requestAnimationFrame(() => {
                    selectCatalogItems();
                });
            }

            if (tradeData.settings && (tradeData.settings.maxTradesPerDay || tradeData.settings.maxTrades)) {
                const maxTradesInput = document.getElementById('max-trades');
                if (maxTradesInput) {
                    const maxTradesValue = tradeData.settings.maxTradesPerDay || tradeData.settings.maxTrades || 5;
                    maxTradesInput.value = maxTradesValue;
                }
            }

            if (tradeData.robuxGive || tradeData.robuxGet) {
                const setRobuxValues = () => {
                    const robuxGiveInput = document.getElementById('robux-give');
                    const robuxGetInput = document.getElementById('robux-get');

                    if (!robuxGiveInput || !robuxGetInput) {
                        requestAnimationFrame(setRobuxValues);
                        return;
                    }

                    if (tradeData.robuxGive && robuxGiveInput) {
                        robuxGiveInput.value = tradeData.robuxGive;

                        if (window.validateRobuxInput) {
                            window.validateRobuxInput('give');
                        }
                    }

                    if (tradeData.robuxGet && robuxGetInput) {
                        robuxGetInput.value = tradeData.robuxGet;

                        if (window.validateRobuxInput) {
                            window.validateRobuxInput('get');
                        }
                    }

                    if (window.updateTradeSummaryGlobal) {
                        window.updateTradeSummaryGlobal();
                    }
                };

                requestAnimationFrame(setRobuxValues);
            }

            window.editingTradeId = tradeData.id;

            requestAnimationFrame(() => {
                const allSelectedItems = document.querySelectorAll('#inventory-grid .item-card.selected, #catalog-grid .item-card.selected');
                if (allSelectedItems.length > 0) {
                    if (window.updateTradeSummaryGlobal) {
                        window.updateTradeSummaryGlobal();
                    }
                }
            });

            Storage.remove('editingTrade');

        } catch (error) {
            Storage.remove('editingTrade');
        }
    }

    window.checkForEditMode = checkForEditMode;

    window.debugEditMode = function() {
        const inventoryCards = document.querySelectorAll('#inventory-grid .item-card');

        const itemGroups = {};
        inventoryCards.forEach((card, index) => {
            const itemName = card.dataset.item;
            if (!itemGroups[itemName]) {
                itemGroups[itemName] = [];
            }
            itemGroups[itemName].push({
                index: index,
                dataIndex: card.dataset.index,
                selected: card.classList.contains('selected'),
                onHold: card.dataset.onHold === 'true'
            });
        });

        const autoTrades = Storage.getAccount('autoTrades', []);

        return { inventoryCards: inventoryCards.length, itemGroups, autoTrades: autoTrades.length };
    };

})();