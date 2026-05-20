(function () {
    'use strict';
    const {
        collectNormalizedIdsForSlots,
        buildItemDetailsThumbMap,
        extractRawAssetIdFromSlot,
        itemIdForTradeLink,
    } = window.RolimonsItemLookup || {};
    const INIT_ATTR = 'data-rotrade-trade-ad-link-init';
    const EMPTY_IMG_RE = /empty_trade_slot|transparent-square/i;
    const TRADE_LINK_CLASS_DESKTOP_ON = 'btn btn-flat-light-blue btn-very-sharp shadow';
    const TRADE_LINK_CLASS_DESKTOP_OFF = 'btn btn-dark btn-flat-light-blue btn-very-sharp shadow';
    const TRADE_LINK_CLASS_NARROW = 'btn btn-dark btn-flat-light-blue btn-very-sharp shadow';
    const TRADE_LINK_BTN_LABEL = 'Trade Link';
    const TRADE_LINK_BTN_COPIED_LABEL = 'Copied link';
    const TRADE_LINK_COPIED_FEEDBACK_MS = 1e3;
    const tradeLinkButtons = [];
    const tradeLinkCopiedFeedbackTimers = new WeakMap();
    let tradeLinkUiTimer = null;
    let tradeLinkObserver = null;
    function isTradeAdCreatePage() {
        const p = (window.location.pathname || '').replace(/\/+$/, '');
        return p === '/tradeadcreate';
    }
    function isRolimonsLoggedIn() {
        return !!document.getElementById('navbar_player_menu_profile');
    }
    function computeTradeLinkCompacts() {
        const offerIds = collectNormalizedIdsForSlots(0, 3);
        const requestIds = collectNormalizedIdsForSlots(4, 7);
        return {
            sCompact: buildCompactRParam(requestIds),
            rCompact: buildCompactRParam(offerIds),
        };
    }
    function readRobuxNearItemsContainer(itemsId) {
        const items = document.getElementById(itemsId);
        if (!items) {
            return 0;
        }
        let scope = items;
        for (let d = 0; d < 12 && scope; d++) {
            const inp = scope.querySelector ? scope.querySelector('input[name="robux"]') : null;
            if (inp) {
                const v = String(inp.value || '')
                    .replace(/,/g, '')
                    .replace(/\s/g, '')
                    .trim();
                const n = parseInt(v, 10);
                return isFinite(n) && n >= 0 ? n : 0;
            }
            scope = scope.parentElement;
        }
        return 0;
    }
    function getTradeAdRobuxAmounts() {
        const fromDom = {
            offerRobux: readRobuxNearItemsContainer('offer_items'),
            requestRobux: readRobuxNearItemsContainer('request_items'),
        };
        if (fromDom.offerRobux > 0 || fromDom.requestRobux > 0) {
            return fromDom;
        }
        const to = window.trade_object;
        if (!to || typeof to !== 'object') {
            return fromDom;
        }
        const keysOffer = ['offer_robux', 'trade_ad_offer_robux', 'robux_offer', 'offerRobux'];
        const keysReq = [
            'request_robux',
            'trade_ad_request_robux',
            'robux_request',
            'requestRobux',
        ];
        function pick(keys) {
            for (let i = 0; i < keys.length; i++) {
                const v = to[keys[i]];
                if (v == null || v === '') {
                    continue;
                }
                const n = parseInt(String(v).replace(/,/g, ''), 10);
                if (isFinite(n) && n >= 0) {
                    return n;
                }
            }
            return 0;
        }
        return {
            offerRobux: pick(keysOffer),
            requestRobux: pick(keysReq),
        };
    }
    function canCopyTradeLink() {
        const c = computeTradeLinkCompacts();
        const rb = getTradeAdRobuxAmounts();
        return !!(c.sCompact || c.rCompact || rb.offerRobux > 0 || rb.requestRobux > 0);
    }
    let lastDisabledDiagKey = '';
    function buildTradeLinkDisabledDiagnostics() {
        buildItemDetailsThumbMap();
        const details = window.item_details;
        const detailKeyCount =
            details && typeof details === 'object' ? Object.keys(details).length : -1;
        const mapEntryCount = itemDetailsThumbMap ? Object.keys(itemDetailsThumbMap).length : 0;
        const to = window.trade_object;
        const itemSlots =
            to && Array.isArray(to.item_slots)
                ? to.item_slots.map(function (v, i) {
                      return i + ':' + String(v);
                  })
                : ['(no trade_object.item_slots)'];
        const slotsDiag = [];
        for (let s = 0; s < 8; s++) {
            const raw = extractRawAssetIdFromSlot(s);
            const key = raw ? itemIdForTradeLink(raw) : null;
            const img = document.getElementById('item_img_' + s);
            const src = img ? String(img.getAttribute('src') || '') : '';
            const srcShort = src.length > 100 ? src.slice(0, 100) + '…' : src;
            const emptySlot = EMPTY_IMG_RE.test(src);
            slotsDiag.push({
                slot: s,
                raw: raw || null,
                normalized: key || null,
                emptyImg: emptySlot,
                src: srcShort || null,
            });
        }
        const c = computeTradeLinkCompacts();
        const rb = getTradeAdRobuxAmounts();
        return {
            detailKeyCount: detailKeyCount,
            mapEntryCount: mapEntryCount,
            hasAliases: !!window.TradeItemIdAliases,
            itemSlots: itemSlots.join(', '),
            offerCompact_r: c.rCompact || '',
            requestCompact_s: c.sCompact || '',
            offerRobux_r: rb.offerRobux,
            requestRobux_s: rb.requestRobux,
            slots: slotsDiag,
        };
    }
    function logTradeLinkDiagnosticsIfNeeded(enabled) {
        if (enabled) {
            lastDisabledDiagKey = '';
            return;
        }
        const diag = buildTradeLinkDisabledDiagnostics();
        const key = JSON.stringify({
            detailKeyCount: diag.detailKeyCount,
            mapEntryCount: diag.mapEntryCount,
            offer: diag.offerCompact_r,
            request: diag.requestCompact_s,
            r_robux: diag.offerRobux_r,
            s_robux: diag.requestRobux_s,
            slots: diag.slots.map(function (s) {
                return (
                    s.slot +
                    ':' +
                    (s.raw || '-') +
                    '→' +
                    (s.normalized || '-') +
                    (s.emptyImg ? '(empty)' : '')
                );
            }),
        });
        if (key === lastDisabledDiagKey) {
            return;
        }
        lastDisabledDiagKey = key;
    }
    function applyTradeLinkButtonVisual(btn, enabled) {
        const isNarrow = btn.id === 'rotrade_trade_link_btn_narrow';
        btn.className = isNarrow
            ? TRADE_LINK_CLASS_NARROW
            : enabled
              ? TRADE_LINK_CLASS_DESKTOP_ON
              : TRADE_LINK_CLASS_DESKTOP_OFF;
        btn.style.cursor = enabled ? '' : 'not-allowed';
        btn.style.opacity = '';
        btn.style.backgroundColor = '';
    }
    function updateTradeLinkButtonsState() {
        const enabled = canCopyTradeLink();
        logTradeLinkDiagnosticsIfNeeded(enabled);
        for (let i = 0; i < tradeLinkButtons.length; i++) {
            const btn = tradeLinkButtons[i];
            if (!btn) {
                continue;
            }
            btn.disabled = !enabled;
            applyTradeLinkButtonVisual(btn, enabled);
            btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
            btn.setAttribute(
                'title',
                enabled
                    ? 'Copy RoTrade trade URL (items: Offer→r, Request→s; Robux: r_robux/s_robux)'
                    : 'Add catalog items and/or Robux on Offer/Request to copy a trade link'
            );
        }
    }
    function startTradeLinkUiSync() {
        updateTradeLinkButtonsState();
        if (tradeLinkObserver) {
            try {
                tradeLinkObserver.disconnect();
            } catch {}
        }
        tradeLinkObserver = new MutationObserver(function () {
            updateTradeLinkButtonsState();
        });
        const roots = [
            document.getElementById('offer_items'),
            document.getElementById('request_items'),
        ].filter(Boolean);
        roots.forEach(function (root) {
            try {
                tradeLinkObserver.observe(root, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['src', 'class'],
                });
            } catch {}
        });
        if (tradeLinkUiTimer) {
            clearInterval(tradeLinkUiTimer);
        }
        tradeLinkUiTimer = setInterval(updateTradeLinkButtonsState, 350);
        function onRobuxFieldInput(ev) {
            const t = ev.target;
            if (
                isTradeAdCreatePage() &&
                t &&
                t.getAttribute &&
                t.getAttribute('name') === 'robux'
            ) {
                updateTradeLinkButtonsState();
            }
        }
        document.addEventListener('input', onRobuxFieldInput, true);
        document.addEventListener('change', onRobuxFieldInput, true);
        window.addEventListener(
            'pagehide',
            function () {
                document.removeEventListener('input', onRobuxFieldInput, true);
                document.removeEventListener('change', onRobuxFieldInput, true);
                if (tradeLinkUiTimer) {
                    clearInterval(tradeLinkUiTimer);
                    tradeLinkUiTimer = null;
                }
            },
            {
                once: true,
            }
        );
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
    function resolveRobloxUserIdFromPage() {
        const myTradeAds = document.getElementById('navbar_player_menu_my_trade_ads');
        if (myTradeAds) {
            const h = myTradeAds.getAttribute('href') || '';
            const pm = h.match(/\/playertrades\/(\d{5,})(?:\/|$|\?)/);
            if (pm && pm[1] && pm[1] !== '0') {
                return pm[1];
            }
        }
        const list = document.querySelectorAll(
            'a[href*="/playertrades/"], a[href*="roblox.com/users/"], a[href*="www.roblox.com/users/"]'
        );
        for (let i = 0; i < list.length; i++) {
            const href = list[i].getAttribute('href') || '';
            const pt = href.match(/\/playertrades\/(\d{5,})(?:\/|$|\?)/);
            if (pt && pt[1] && pt[1] !== '0') {
                return pt[1];
            }
            const m = href.match(/\/users\/(\d{5,})(?:\/|$)/);
            if (m && m[1] && m[1] !== '0') {
                return m[1];
            }
        }
        return null;
    }
    function buildTradeTemplateUrl(sCompact, rCompact, robux) {
        const params = new URLSearchParams();
        params.set('rotrade', '1');
        if (sCompact) {
            params.set('s', sCompact);
        }
        if (rCompact) {
            params.set('r', rCompact);
        }
        const rb = robux || getTradeAdRobuxAmounts();
        const rRob = Math.max(0, Math.floor(Number(rb.offerRobux) || 0));
        const sRob = Math.max(0, Math.floor(Number(rb.requestRobux) || 0));
        if (rRob > 0) {
            params.set('r_robux', String(rRob));
        }
        if (sRob > 0) {
            params.set('s_robux', String(sRob));
        }
        const qs = params.toString();
        const uid = resolveRobloxUserIdFromPage();
        if (uid) {
            return 'https://www.roblox.com/users/' + encodeURIComponent(uid) + '/trade?' + qs;
        }
        return 'https://www.roblox.com/users/0/trade?' + qs;
    }
    function copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
        } finally {
            document.body.removeChild(ta);
        }
        return Promise.resolve();
    }
    function showTradeLinkCopiedFeedback(btn) {
        if (!btn) {
            return;
        }
        const prevTimer = tradeLinkCopiedFeedbackTimers.get(btn);
        if (prevTimer) {
            clearTimeout(prevTimer);
        }
        btn.textContent = TRADE_LINK_BTN_COPIED_LABEL;
        const t = setTimeout(function () {
            btn.textContent = TRADE_LINK_BTN_LABEL;
            tradeLinkCopiedFeedbackTimers.delete(btn);
        }, TRADE_LINK_COPIED_FEEDBACK_MS);
        tradeLinkCopiedFeedbackTimers.set(btn, t);
    }
    function onTradeLinkClick(ev) {
        const btn = ev && ev.currentTarget;
        if (btn && btn.disabled) {
            return;
        }
        const offerIds = collectNormalizedIdsForSlots(0, 3);
        const requestIds = collectNormalizedIdsForSlots(4, 7);
        const rCompact = buildCompactRParam(offerIds);
        const sCompact = buildCompactRParam(requestIds);
        if (!sCompact && !rCompact) {
            const rbOnly = getTradeAdRobuxAmounts();
            if (!(rbOnly.offerRobux > 0 || rbOnly.requestRobux > 0)) {
                return;
            }
        }
        const url = buildTradeTemplateUrl(sCompact, rCompact, null);
        const uid = resolveRobloxUserIdFromPage();
        copyTextToClipboard(url).then(
            function () {
                showTradeLinkCopiedFeedback(btn);
                if (!uid) {
                    window.alert(
                        'Trade link copied.\n\nNo Roblox profile link was found on this page; the URL uses /users/0/. Replace 0 with your Roblox user id (from your Roblox profile URL) before sharing.'
                    );
                }
            },
            function () {
                window.prompt('Copy this trade link:', url);
            }
        );
    }
    function wrapSubmitAndAddButton(submitEl, isNarrow) {
        if (!submitEl || submitEl.getAttribute(INIT_ATTR) === '1') {
            return;
        }
        const wrap = document.createElement('div');
        wrap.className = 'rotrade-trade-ad-actions d-flex align-items-center';
        wrap.style.gap = '10px';
        wrap.style.flexWrap = 'wrap';
        wrap.style.justifyContent = 'center';
        if (!isNarrow) {
            wrap.style.position = 'absolute';
            wrap.style.bottom = '19px';
            wrap.style.left = '50%';
            wrap.style.transform = 'translateX(-50%)';
        }
        const parent = submitEl.parentNode;
        parent.insertBefore(wrap, submitEl);
        wrap.appendChild(submitEl);
        submitEl.style.position = 'static';
        submitEl.style.left = 'auto';
        submitEl.style.transform = 'none';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = isNarrow ? 'rotrade_trade_link_btn_narrow' : 'rotrade_trade_link_btn';
        btn.className = isNarrow ? TRADE_LINK_CLASS_NARROW : TRADE_LINK_CLASS_DESKTOP_OFF;
        btn.textContent = TRADE_LINK_BTN_LABEL;
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        btn.setAttribute('aria-disabled', 'true');
        btn.setAttribute(
            'title',
            'Add catalog items and/or Robux on Offer/Request to copy a trade link'
        );
        btn.addEventListener('click', onTradeLinkClick);
        wrap.appendChild(btn);
        tradeLinkButtons.push(btn);
        submitEl.setAttribute(INIT_ATTR, '1');
    }
    function init() {
        if (!isTradeAdCreatePage() || !isRolimonsLoggedIn()) {
            return;
        }
        const desktopSubmit = document.getElementById('submit_trade');
        const narrowSubmit = document.getElementById('submit_trade_narrow');
        if (desktopSubmit) {
            wrapSubmitAndAddButton(desktopSubmit, false);
        }
        if (narrowSubmit) {
            wrapSubmitAndAddButton(narrowSubmit, true);
        }
        if (tradeLinkButtons.length) {
            startTradeLinkUiSync();
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
