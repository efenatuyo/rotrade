(function () {
    'use strict';
    function init() {
        if (window.ContentStyles && window.ContentStyles.injectStyles) {
            window.ContentStyles.injectStyles();
        }
        if (window.ContentMargins && window.ContentMargins.initMarginObserver) {
            window.ContentMargins.initMarginObserver();
        }
        BridgeUtils.setupPageContextBridge();
        if (window.addAutoTradesTab) {
            window.addAutoTradesTab();
        }
        if (window.handleRouting) {
            window.handleRouting();
        }
        if (window.TradeDetailContext && window.TradeDetailContext.init) {
            window.TradeDetailContext.init();
        }
        if (window.TradeRequestWishlist && window.TradeRequestWishlist.init) {
            window.TradeRequestWishlist.init();
        }
        if (window.ProfileValueContext && window.ProfileValueContext.init) {
            window.ProfileValueContext.init();
        }
        if (window.startAutoUpdateSystem) {
            window.startAutoUpdateSystem();
        }
        Utils.delay(2e3).then(() => {
            if (window.TradeStatus && window.TradeStatus.cleanupTradeCategories) {
                window.TradeStatus.cleanupTradeCategories();
            }
            if (window.migrateTradesForRobux) {
                window.migrateTradesForRobux();
            }
        });
        const observer = new MutationObserver(() => {
            if (window.addAutoTradesTab) {
                window.addAutoTradesTab();
            }
            if (window.ProofsLink && window.ProofsLink.addProofsLinkToItems) {
                window.ProofsLink.addProofsLinkToItems();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
        if (window.ProofsLink && window.ProofsLink.addProofsLinkToItems) {
            window.ProofsLink.addProofsLinkToItems();
            Utils.delay(500).then(() => window.ProofsLink.addProofsLinkToItems());
            Utils.delay(1500).then(() => window.ProofsLink.addProofsLinkToItems());
        }
        if (window.ContentResponsive && window.ContentResponsive.initResponsive) {
            window.ContentResponsive.initResponsive();
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
