(function() {
    'use strict';

    const filterInventory = Utils.throttle((query) => {
        const items = DOM.$$('#inventory-grid .item-card');
        const queryLower = query.toLowerCase();
        items.forEach(item => {
            item.style.display = item.dataset.item.toLowerCase().includes(queryLower) ? 'block' : 'none';
        });
    }, 100);

    const filterCatalog = Utils.throttle((query) => {
        const items = DOM.$$('#catalog-grid .item-card');
        const queryLower = query.toLowerCase();
        items.forEach(item => {
            item.style.display = item.dataset.item.toLowerCase().includes(queryLower) ? 'block' : 'none';
        });
    }, 100);

    window.filterInventory = filterInventory;
    window.filterCatalog = filterCatalog;

})();