(function() {
    'use strict';

    const updateTradeSummary = TradeSummary.updateTradeSummary;
    const updateCatalogVisual = Inventory.updateCatalogVisual;

    document.addEventListener('click', function(e) {
        const catalogSummaryItem = e.target.closest('.clickable-summary');
        if (catalogSummaryItem) {
            const itemId = catalogSummaryItem.dataset.originalItemId;
            const catalogItem = document.querySelector(`#catalog-grid .item-card[data-id="${itemId}"]`);
            if (catalogItem) {
                const currentQuantityAttr = catalogItem.getAttribute('data-quantity');
                const currentQuantityDataset = catalogItem.dataset.quantity;
                const currentQuantity = parseInt(currentQuantityAttr) || parseInt(currentQuantityDataset) || 0;
                if (currentQuantity > 0) {
                    const newQuantity = currentQuantity - 1;
                    updateCatalogVisual(catalogItem, newQuantity);
                    if (window.updateTradeSummaryGlobalImmediate) {
                        window.updateTradeSummaryGlobalImmediate();
                    } else if (window.updateTradeSummaryGlobal) {
                        window.updateTradeSummaryGlobal();
                    } else if (window.TradeSummary && window.TradeSummary.updateTradeSummaryInternal) {
                        window.TradeSummary.updateTradeSummaryInternal();
                    } else if (updateTradeSummary) {
                        updateTradeSummary();
                    }
                }
            }
            return;
        }

        const inventorySummaryItem = e.target.closest('.clickable-inventory-summary');
        if (inventorySummaryItem) {
            const itemIndex = inventorySummaryItem.dataset.originalItemIndex;
            const inventoryItem = document.querySelector(`#inventory-grid .item-card[data-index="${itemIndex}"]`);
            if (inventoryItem && inventoryItem.classList.contains('selected')) {
                inventoryItem.classList.remove('selected');
                inventoryItem.style.removeProperty('--quantity-number');
                if (window.updateTradeSummaryGlobalImmediate) {
                    window.updateTradeSummaryGlobalImmediate();
                } else if (window.updateTradeSummaryGlobal) {
                    window.updateTradeSummaryGlobal();
                } else if (window.TradeSummary && window.TradeSummary.updateTradeSummaryInternal) {
                    window.TradeSummary.updateTradeSummaryInternal();
                } else if (updateTradeSummary) {
                    updateTradeSummary();
                }
            }
        }
    });

})();