(function() {
    'use strict';

    function setupCreateTradeEventListeners() {
        const backBtn = document.querySelector('.back-link');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const path = window.Routing ? window.Routing.buildPath('/auto-trades') : '/auto-trades';
                window.location.href = path;
            });
        }

        const inventorySearch = document.getElementById('inventory-search');
        if (inventorySearch) {
            inventorySearch.addEventListener('input', (e) => {
                if (window.filterInventory) {
                    window.filterInventory(e.target.value);
                }
            });
        }

        const catalogSearch = document.getElementById('catalog-search');
        if (catalogSearch) {
            catalogSearch.addEventListener('input', (e) => {
                if (window.filterCatalog) {
                    window.filterCatalog(e.target.value);
                }
            });
        }

        const createBtn = document.getElementById('create-auto-trade');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                if (window.createAutoTrade) {
                    window.createAutoTrade();
                }
            });
        }

        const robuxGiveInput = document.getElementById('robux-give');
        const robuxGetInput = document.getElementById('robux-get');
        const robuxGiveInfo = document.getElementById('robux-give-info');
        const robuxGetInfo = document.getElementById('robux-get-info');

        if (robuxGiveInput && robuxGiveInfo) {
            robuxGiveInput.addEventListener('input', () => {
                if (window.validateRobuxInput) {
                    window.validateRobuxInput('give');
                }
            });
        }
        if (robuxGetInput && robuxGetInfo) {
            robuxGetInput.addEventListener('input', () => {
                if (window.validateRobuxInput) {
                    window.validateRobuxInput('get');
                }
            });
        }

        function updateRobuxValidation() {
            if (robuxGiveInput && robuxGiveInput.value && window.validateRobuxInput) {
                window.validateRobuxInput('give');
            }
            if (robuxGetInput && robuxGetInput.value && window.validateRobuxInput) {
                window.validateRobuxInput('get');
            }
            if (window.updateTradeSummaryGlobal) {
                window.updateTradeSummaryGlobal();
            }
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('item-card')) {
                setTimeout(updateRobuxValidation, 100);
            }
        });

        if (robuxGiveInput) {
            robuxGiveInput.addEventListener('input', () => {
                if (window.validateRobuxInput) {
                    window.validateRobuxInput('give');
                }
                Utils.nextFrame(() => {
                    if (window.updateTradeSummaryGlobal) {
                        window.updateTradeSummaryGlobal();
                    }
                });
            });
        }
        if (robuxGetInput) {
            robuxGetInput.addEventListener('input', () => {
                if (window.validateRobuxInput) {
                    window.validateRobuxInput('get');
                }
                Utils.nextFrame(() => {
                    if (window.updateTradeSummaryGlobal) {
                        window.updateTradeSummaryGlobal();
                    }
                });
            });
        }

        if (window.validateRobuxInput) {
            window.validateRobuxInput = window.validateRobuxInput;
        }
    }

    window.EventListenersCreateTrade = {
        setupCreateTradeEventListeners
    };

    window.setupCreateTradeEventListeners = setupCreateTradeEventListeners;

})();