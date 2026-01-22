(function() {
    'use strict';

    function shouldProcessItemCard(itemCard) {
        const pathname = window.location.pathname;
        const normalizedPath = window.Routing ? window.Routing.normalizePath(pathname) : pathname;
        if (normalizedPath !== '/trades') return false;
        if (document.body.classList.contains('path-auto-trades-send')) return false;

        if (!window.ProofsLinkConfig) return false;

        const { SELECTORS } = window.ProofsLinkConfig;
        const itemCardPrice = itemCard.querySelector(SELECTORS.itemCardPrice);
        if (!itemCardPrice) return false;
        
        if (itemCard.querySelector(SELECTORS.proofsLink)) return false;

        return true;
    }

    function addProofsLinkToSingleItem(itemCard) {
        if (!shouldProcessItemCard(itemCard)) return;
        if (!window.ProofsLinkExtractor || !window.ProofsLinkDOM || !window.ProofsLinkConfig) return;

        const { extractItemId } = window.ProofsLinkExtractor;
        const { createProofsLink } = window.ProofsLinkDOM;

        const itemId = extractItemId(itemCard);
        if (!itemId) return;

        const thumbContainer = itemCard.querySelector('.item-card-thumb-container');
        if (!thumbContainer) return;

        const proofsLink = createProofsLink(itemId);
        if (!proofsLink) return;

        try {
            thumbContainer.appendChild(proofsLink);
        } catch (error) {
            console.error('Error adding proofs link:', error);
        }
    }

    function addProofsLinkToItems() {
        if (!window.ProofsLinkConfig) return;

        const { SELECTORS } = window.ProofsLinkConfig;
        const itemCards = document.querySelectorAll(SELECTORS.itemCards);
        itemCards.forEach(addProofsLinkToSingleItem);
    }

    function init() {
        if (!window.ProofsLinkConfig || !window.ProofsLinkDOM) {
            console.error('ProofsLink dependencies not loaded');
            return;
        }

        try {
            window.ProofsLinkDOM.addProofsLinkStyles();
            addProofsLinkToItems();
        } catch (error) {
            console.error('Error initializing proofs link:', error);
        }
    }

    window.ProofsLink = {
        addProofsLinkToItems,
        init
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
