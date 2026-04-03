(function () {
    'use strict';
    function isTradesPage() {
        return window.Routing.normalizePath(window.location.pathname) === '/trades';
    }
    function isCatalogBrowsePage() {
        return window.Routing.normalizePath(window.location.pathname) === '/catalog';
    }
    function isCatalogItemDetailPage() {
        return /^\/catalog\/\d+/.test(window.Routing.normalizePath(window.location.pathname));
    }
    function isBundleItemDetailPage() {
        return /^\/bundles\/\d+/.test(window.Routing.normalizePath(window.location.pathname));
    }
    function isMarketplaceItemDetailPage() {
        return isCatalogItemDetailPage() || isBundleItemDetailPage();
    }
    function parseCatalogItemIdFromPath() {
        const m = window.Routing.normalizePath(window.location.pathname).match(/^\/catalog\/(\d+)/);
        return m ? m[1] : null;
    }
    function parseBundleIdFromPath() {
        const m = window.Routing.normalizePath(window.location.pathname).match(/^\/bundles\/(\d+)/);
        return m ? m[1] : null;
    }
    function resolveMarketplaceItemDetailPair() {
        const el =
            document.querySelector('#item-info-container-frontend[data-target-id]') ||
            document.querySelector('#item-thumbnail-container-frontend[data-target-id]');
        let id = el && el.getAttribute('data-target-id');
        if (!id) {
            id = parseCatalogItemIdFromPath();
        }
        if (!id) {
            id = parseBundleIdFromPath();
        }
        if (!id) {
            return null;
        }
        const raw = String(id).trim();
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        const n = normalize(raw);
        return {
            rawItemId: raw,
            itemId: n != null && n !== '' ? n : raw,
        };
    }
    window.TradeDetailPath = {
        isTradesPage: isTradesPage,
        isCatalogBrowsePage: isCatalogBrowsePage,
        isCatalogItemDetailPage: isCatalogItemDetailPage,
        isBundleItemDetailPage: isBundleItemDetailPage,
        isMarketplaceItemDetailPage: isMarketplaceItemDetailPage,
        parseCatalogItemIdFromPath: parseCatalogItemIdFromPath,
        parseBundleIdFromPath: parseBundleIdFromPath,
        resolveMarketplaceItemDetailPair: resolveMarketplaceItemDetailPair,
    };
})();
