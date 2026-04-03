(function () {
    'use strict';
    const PROCESSED_ATTR = 'data-rotrade-send-trade-augmented';
    const ITEM_HANDLER_RE = /item_select_handler\s*\(\s*(\d+)/;
    function isTradesListPage() {
        const p = (window.location.pathname || '').replace(/\/+$/, '');
        if (p === '/trades' || p.endsWith('/trades')) {
            return true;
        }
        if (p === '/playertrades' || /^\/playertrades\/\d+/.test(p)) {
            return true;
        }
        return false;
    }
    function parseItemIdFromOnclick(onclick) {
        if (!onclick || typeof onclick !== 'string') {
            return null;
        }
        const m = onclick.match(ITEM_HANDLER_RE);
        return m ? m[1] : null;
    }
    function idForTradeAutoFillUrl(rawId) {
        const Aliases = window.TradeItemIdAliases;
        if (Aliases && typeof Aliases.itemIdForAutoInstanceApi === 'function') {
            return String(Aliases.itemIdForAutoInstanceApi(rawId));
        }
        return String(rawId);
    }
    function collectOfferItemIds(mixItem) {
        const offerRoot = mixItem.querySelector('.ad_side_left');
        if (!offerRoot) {
            return [];
        }
        const imgs = offerRoot.querySelectorAll('img.ad_item_img[onclick]');
        const ids = [];
        for (let i = 0; i < imgs.length; i++) {
            const raw = parseItemIdFromOnclick(imgs[i].getAttribute('onclick') || '');
            if (!raw) {
                continue;
            }
            ids.push(idForTradeAutoFillUrl(raw));
        }
        return ids;
    }
    function parseStatRobuxFromAdSide(sideRoot) {
        if (!sideRoot) {
            return 0;
        }
        const wrap = sideRoot.querySelector('.stat_robux');
        if (!wrap) {
            return 0;
        }
        const span = wrap.querySelector('span') || wrap;
        const text = String(span.textContent || '')
            .replace(/,/g, '')
            .replace(/\s/g, '')
            .trim();
        if (!text || text === '-') {
            return 0;
        }
        const n = parseInt(text, 10);
        return isFinite(n) && n >= 0 ? n : 0;
    }
    function collectAdRobuxAmounts(mixItem) {
        const left = mixItem.querySelector('.ad_side_left');
        const right = mixItem.querySelector('.ad_side_right');
        return {
            offerRobux: parseStatRobuxFromAdSide(left),
            requestRobux: parseStatRobuxFromAdSide(right),
        };
    }
    function buildCompactRParam(ids) {
        if (!ids || !ids.length) {
            return '';
        }
        const counts = Object.create(null);
        const order = [];
        for (let i = 0; i < ids.length; i++) {
            const id = String(ids[i]);
            if (!Object.prototype.hasOwnProperty.call(counts, id)) {
                counts[id] = 0;
                order.push(id);
            }
            counts[id]++;
        }
        const parts = [];
        let total = 0;
        for (let i = 0; i < order.length; i++) {
            const id = order[i];
            let n = counts[id];
            n = Math.min(n, 4 - total);
            if (n <= 0) {
                break;
            }
            parts.push(n > 1 ? id + '*' + n : id);
            total += n;
            if (total >= 4) {
                break;
            }
        }
        return parts.join(',');
    }
    function augmentSendTradeLink(anchor) {
        if (!anchor || anchor.nodeName !== 'A' || anchor.getAttribute(PROCESSED_ATTR) === '1') {
            return;
        }
        const mixItem = anchor.closest('.mix_item');
        if (!mixItem) {
            return;
        }
        const href = anchor.getAttribute('href');
        if (!href || href.indexOf('roblox.com/users/') === -1 || href.indexOf('/trade') === -1) {
            return;
        }
        const ids = collectOfferItemIds(mixItem);
        const r = buildCompactRParam(ids);
        const rb = collectAdRobuxAmounts(mixItem);
        if (!r && !(rb.offerRobux > 0) && !(rb.requestRobux > 0)) {
            anchor.setAttribute(PROCESSED_ATTR, '1');
            return;
        }
        try {
            const u = new URL(href, window.location.href);
            u.searchParams.set('rotrade', '1');
            if (r) {
                u.searchParams.set('r', r);
            }
            if (rb.offerRobux > 0) {
                u.searchParams.set('r_robux', String(rb.offerRobux));
            }
            if (rb.requestRobux > 0) {
                u.searchParams.set('s_robux', String(rb.requestRobux));
            }
            anchor.setAttribute('href', u.toString());
        } catch {}
        anchor.setAttribute(PROCESSED_ATTR, '1');
    }
    function scanContainer(root) {
        root = root || document;
        root.querySelectorAll('a.send_trade_button[href*="roblox.com/users/"]').forEach(
            augmentSendTradeLink
        );
    }
    let debounceTimer = null;
    function scheduleScan() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(function () {
            debounceTimer = null;
            scanContainer(document);
        }, 80);
    }
    function init() {
        if (!isTradesListPage()) {
            return;
        }
        scanContainer(document);
        const mo = new MutationObserver(function () {
            scheduleScan();
        });
        const mount = document.querySelector('.mix_container') || document.body;
        try {
            mo.observe(mount, {
                childList: true,
                subtree: true,
            });
        } catch {}
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
