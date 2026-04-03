(function () {
    'use strict';
    function isTradeRequestFlowPage() {
        const p = window.Routing.normalizePath(window.location.pathname);
        return /^\/users\/\d+\/trade$/.test(p) || /^\/trades\/\d+\/counter$/.test(p);
    }
    function findTradeAppRoot() {
        return (
            document.getElementById('trades-web-app') ||
            document.querySelector('.trades-container') ||
            document.body
        );
    }
    function extractUserIdFromPartnerLink(link) {
        if (!link) {
            return null;
        }
        const href = link.getAttribute('href') || link.getAttribute('ng-href') || '';
        const m = href.match(/\/users\/(\d+)/);
        return m ? m[1] : null;
    }
    function partnerUserIdFromUrl() {
        const p = window.Routing.normalizePath(window.location.pathname);
        const m = p.match(/^\/users\/(\d+)\/trade$/);
        return m ? m[1] : null;
    }
    function resolvePartnerUserId(root) {
        const fromPath = partnerUserIdFromUrl();
        if (fromPath) {
            return fromPath;
        }
        const find = window.TradeDetailItemIds && window.TradeDetailItemIds.findPartnerUserLink;
        if (!find) {
            return null;
        }
        return extractUserIdFromPartnerLink(find(root));
    }
    function findRequesterInventoryPanel(root) {
        const panels = root.querySelectorAll('.trade-inventory-panel');
        for (let i = 0; i < panels.length; i++) {
            const label = panels[i].querySelector('h2.inventory-label');
            const t = (label && label.textContent) || '';
            const trimmed = t.trim();
            if (trimmed && /^your\s+inventory$/i.test(trimmed)) {
                return panels[i];
            }
        }
        if (panels.length >= 1) {
            return panels[0];
        }
        return null;
    }
    function findPartnerInventoryPanel(root) {
        const panels = root.querySelectorAll('.trade-inventory-panel');
        for (let i = 0; i < panels.length; i++) {
            const label = panels[i].querySelector('h2.inventory-label');
            const t = (label && label.textContent) || '';
            const trimmed = t.trim();
            if (trimmed && !/^your\s+inventory$/i.test(trimmed)) {
                return panels[i];
            }
        }
        return null;
    }
    window.TradeRequestWishlistShared = {
        isTradeRequestFlowPage: isTradeRequestFlowPage,
        findTradeAppRoot: findTradeAppRoot,
        extractUserIdFromPartnerLink: extractUserIdFromPartnerLink,
        partnerUserIdFromUrl: partnerUserIdFromUrl,
        resolvePartnerUserId: resolvePartnerUserId,
        findRequesterInventoryPanel: findRequesterInventoryPanel,
        findPartnerInventoryPanel: findPartnerInventoryPanel,
    };
})();
