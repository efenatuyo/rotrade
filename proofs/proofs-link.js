(function () {
    'use strict';
    const BRIDGE_PATH = 'assets/trade-row-id-bridge.js';
    let bridgeInjected = false;

    function isUserTradePage(normalizedPath) {
        return /^\/users\/\d+\/trade\/?$/.test(normalizedPath);
    }
    function shouldProcessItemCard(itemCard) {
        const pathname = window.location.pathname;
        const normalizedPath = window.Routing ? window.Routing.normalizePath(pathname) : pathname;
        const onTradesList = normalizedPath === '/trades';
        const onUserTrade = isUserTradePage(normalizedPath);
        if (!onTradesList && !onUserTrade) return false;
        if (onTradesList && document.body.classList.contains('path-auto-trades-send')) return false;
        if (!window.ProofsLinkConfig) return false;
        const { SELECTORS: SELECTORS } = window.ProofsLinkConfig;
        const itemCardPrice = itemCard.querySelector(SELECTORS.itemCardPrice);
        if (!itemCardPrice) return false;
        if (itemCard.querySelector(SELECTORS.proofsLink)) return false;
        return true;
    }
    function ensureBridge() {
        if (bridgeInjected) return;
        bridgeInjected = true;
        try {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(BRIDGE_PATH);
            script.onload = function () {
                script.remove();
                requestTagRows();
            };
            (document.head || document.documentElement).appendChild(script);
        } catch {
            bridgeInjected = false;
        }
    }
    function requestTagRows() {
        try {
            document.dispatchEvent(new CustomEvent('rotrade:tagTradeRows'));
        } catch {}
    }
    function addProofsLinkToSingleItem(itemCard) {
        if (!shouldProcessItemCard(itemCard)) return;
        if (!window.ProofsLinkExtractor || !window.ProofsLinkDOM || !window.ProofsLinkConfig)
            return;
        const { extractItemContext: extractItemContext } = window.ProofsLinkExtractor;
        const { createProofsLink: createProofsLink } = window.ProofsLinkDOM;
        const context = extractItemContext(itemCard);
        if (!context.itemId && !context.itemName) return;
        const thumbContainer = itemCard.querySelector('.item-card-thumb-container');
        if (!thumbContainer) return;
        const proofsLink = createProofsLink(context);
        if (!proofsLink) return;
        try {
            thumbContainer.appendChild(proofsLink);
        } catch {}
    }
    function addProofsLinkToItems() {
        if (!window.ProofsLinkConfig) return;
        const { SELECTORS: SELECTORS } = window.ProofsLinkConfig;
        requestTagRows();
        const itemCards = document.querySelectorAll(SELECTORS.itemCards);
        itemCards.forEach(addProofsLinkToSingleItem);
    }
    function init() {
        if (!window.ProofsLinkConfig || !window.ProofsLinkDOM) {
            return;
        }
        try {
            window.ProofsLinkDOM.addProofsLinkStyles();
            ensureBridge();
            addProofsLinkToItems();
        } catch {}
    }
    window.ProofsLink = {
        addProofsLinkToItems: addProofsLinkToItems,
        init: init,
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
