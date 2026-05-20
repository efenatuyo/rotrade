(function () {
    'use strict';
    const REQUIRED_GLOBALS = [
        'Storage',
        'DOM',
        'API',
        'Utils',
        'Routing',
        'RobloxSelectors',
        'Scheduler',
        'ModuleRegistry',
        'BridgeUtils',
    ];
    function init() {
        if (window.ModuleRegistry && window.ModuleRegistry.requireGlobals) {
            window.ModuleRegistry.requireGlobals(REQUIRED_GLOBALS);
        }
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
        function runNavInject() {
            if (window.addAutoTradesTab) window.addAutoTradesTab();
        }
        function runProofsInject() {
            const path = window.location.pathname;
            const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
            const onTradesList = normalized === '/trades';
            const onUserTrade = /^\/users\/\d+\/trade\/?$/.test(normalized);
            if (!onTradesList && !onUserTrade) return;
            if (window.ProofsLink && window.ProofsLink.addProofsLinkToItems) {
                window.ProofsLink.addProofsLinkToItems();
            }
            if (onTradesList && window.TradeListValues && window.TradeListValues.refresh) {
                window.TradeListValues.refresh();
            }
        }
        if (window.Scheduler) {
            window.Scheduler.onSidebarMutation(runNavInject);
            window.Scheduler.onBodyMutation(runProofsInject);
        }
        window.addEventListener('popstate', () => {
            runNavInject();
            runProofsInject();
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
