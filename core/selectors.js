(function () {
    'use strict';
    const SELECTORS = {
        navTradeLink: ['a[id="nav-trade"]', 'a[href*="/trades"]'],
        navAutoTradesLink: ['#nav-auto-trades'],
        navSidebarRoot: ['nav ul', 'nav'],
        resellerPriceContainer: [
            '#asset-resale-data-container .reseller-price-container',
            'asset-resale-pane .reseller-price-container',
            '#resellers .reseller-price-container',
            '.resellers .reseller-price-container',
        ],
        tradeItemCard: ['.trade-item-card'],
        tradeFilterChipActive: ['.trade-filter-chip.active', '.filter-btn.active'],
        tradesGridVisible: ['.trades-grid[style*="block"]'],
        thumbnailContainer: ['.thumbnail-2d-container[thumbnail-target-id]'],
        catalogLink: ['a[href*="/catalog/"]', 'a[ng-href*="/catalog/"]'],
        rolimonsItemLink: ['a[href*="rolimons.com/item/"]'],
    };
    const failureLog = new Set();
    function logFailure(key) {
        if (failureLog.has(key)) return;
        failureLog.add(key);
        if (window.Utils && window.Utils.Logger && window.Utils.Logger.log) {
            window.Utils.Logger.log('selector_resolve_failed', { key: key });
        }
    }
    function candidates(key) {
        const c = SELECTORS[key];
        if (!c) {
            logFailure(key + ':unknown');
            return [];
        }
        return c;
    }
    function combined(key) {
        return candidates(key).join(',');
    }
    function find(key, root) {
        const parent = root || document;
        for (const sel of candidates(key)) {
            try {
                const el = parent.querySelector(sel);
                if (el) return el;
            } catch {}
        }
        logFailure(key);
        return null;
    }
    function findAll(key, root) {
        const parent = root || document;
        const all = combined(key);
        if (!all) return [];
        try {
            return Array.from(parent.querySelectorAll(all));
        } catch {
            const out = [];
            const seen = new Set();
            for (const sel of candidates(key)) {
                try {
                    parent.querySelectorAll(sel).forEach((el) => {
                        if (!seen.has(el)) {
                            seen.add(el);
                            out.push(el);
                        }
                    });
                } catch {}
            }
            return out;
        }
    }
    window.RobloxSelectors = {
        candidates: candidates,
        combined: combined,
        find: find,
        findAll: findAll,
        SELECTORS: SELECTORS,
    };
})();
