(function() {
    'use strict';

    const CONFIG = {
        tooltipText: 'View past completed trades',
        linkText: 'Proof',
        baseUrl: 'https://www.roblox.com/proofs'
    };

    const SELECTORS = {
        itemCards: '.trade-item-card',
        itemCardPrice: '.item-card-price',
        proofsLink: '.proofs-link-container',
        robuxValue: '.text-robux.ng-binding',
        thumbnailContainer: '.thumbnail-2d-container[thumbnail-target-id]',
        thumbnailElement: 'thumbnail-2d[thumbnail-target-id]',
        catalogLink: 'a[ng-href*="/catalog/"], a[href*="/catalog/"]',
        rolimonsLink: 'a[href*="rolimons.com/item/"]'
    };

    const REGEX = {
        catalogId: /\/catalog\/(\d+)/,
        rolimonsId: /rolimons\.com\/item\/(\d+)/
    };

    window.ProofsLinkConfig = {
        CONFIG,
        SELECTORS,
        REGEX
    };
})();
