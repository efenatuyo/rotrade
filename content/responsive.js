(function() {
    'use strict';

    function applyResponsiveItemSizing() {
        const itemsLists = document.querySelectorAll('.auto-trades-injected .items-list');

        itemsLists.forEach(list => {
            list.classList.remove('items-2', 'items-3', 'items-4', 'items-5', 'items-6', 'items-7', 'items-8-plus');

            const itemCount = list.querySelectorAll('.item-icon').length;

            if (itemCount === 2) {
                list.classList.add('items-2');
            } else if (itemCount === 3) {
                list.classList.add('items-3');
            } else if (itemCount === 4) {
                list.classList.add('items-4');
            } else if (itemCount === 5) {
                list.classList.add('items-5');
            } else if (itemCount === 6) {
                list.classList.add('items-6');
            } else if (itemCount === 7) {
                list.classList.add('items-7');
            } else if (itemCount >= 8) {
                list.classList.add('items-8-plus');
            }
        });
    }

    function observeForItemChanges() {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList.contains('items-list') ||
                                node.querySelector && node.querySelector('.items-list')) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });

            if (shouldUpdate) {
                Utils.delay(50).then(() => applyResponsiveItemSizing());
            }
        });

        const container = document.querySelector('.auto-trades-injected');
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: true
            });
        }

        applyResponsiveItemSizing();
    }

    function initResponsive() {
        if (window.location.pathname.includes('/auto-trades') ||
            document.querySelector('.auto-trades-injected')) {

            Utils.delay(100).then(() => {
                applyResponsiveItemSizing();
                observeForItemChanges();
            });
        }
    }

    window.ContentResponsive = {
        applyResponsiveItemSizing,
        observeForItemChanges,
        initResponsive
    };

})();