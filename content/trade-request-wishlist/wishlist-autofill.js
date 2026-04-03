(function () {
    'use strict';
    const S = window.TradeRequestWishlistShared;
    let autoFillInFlight = false;
    let lastAutoFillSignature = '';
    const AUTOFILL_MAX_PAGE_TURNS = 1e3;
    const AUTOFILL_CLICK_SETTLE_MS = 400;
    const AUTOFILL_AFTER_PROGRESS_YIELD_MS = 160;
    const AUTOFILL_SETTLE_RETRY_PASSES = 12;
    const AUTOFILL_SETTLE_RETRY_GAP_MS = 400;
    const AUTOFILL_PRE_FAILURE_SETTLE_MS = 900;
    const AUTOFILL_INITIAL_STABLE_WAIT_MS = 5000;
    const AUTOFILL_NO_PROGRESS_STABLE_WAIT_MS = 6000;
    const AUTOFILL_NO_PROGRESS_EXTRA_SCAN_PASSES = 5;
    const AUTOFILL_NO_PROGRESS_EXTRA_GAP_MS = 400;
    const AUTOFILL_NO_PROGRESS_EXTRA_STABLE_WAIT_MS = 2500;
    const AUTOFILL_PAGE_TURN_POLL_MS = 6000;
    const AUTOFILL_PAGE_TURN_POLL_STEP_MS = 140;
    const AUTOFILL_POPUP_ID = 'rotrade-autofill-popup-overlay';
    let autoFillPopupEscapeHandler = null;
    function parseBoolParam(v) {
        if (v == null) {
            return false;
        }
        const s = String(v).trim().toLowerCase();
        return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on';
    }
    function readQueryParam(params, keys) {
        for (let i = 0; i < keys.length; i++) {
            const v = params.get(keys[i]);
            if (v != null && String(v).trim() !== '') {
                return v;
            }
        }
        return null;
    }
    function parseItemCountMap(raw) {
        if (!raw) {
            return {};
        }
        let parsed = null;
        try {
            parsed = JSON.parse(raw);
        } catch {
            try {
                parsed = JSON.parse(decodeURIComponent(raw));
            } catch {
                parsed = null;
            }
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        const out = {};
        for (const k of Object.keys(parsed)) {
            const id = String(k || '').trim();
            if (!id) {
                continue;
            }
            const n = parseInt(parsed[k], 10);
            if (isFinite(n) && n > 0) {
                out[id] = n;
            }
        }
        return out;
    }
    function parseCompactItemCountList(raw) {
        if (!raw) {
            return {};
        }
        const out = {};
        const parts = String(raw)
            .split(',')
            .map(function (x) {
                return String(x || '').trim();
            })
            .filter(Boolean);
        for (let i = 0; i < parts.length; i++) {
            const token = parts[i];
            let id = token;
            let amount = 1;
            const multIdx = token.indexOf('*');
            if (multIdx > 0) {
                id = token.slice(0, multIdx).trim();
                const n = parseInt(token.slice(multIdx + 1), 10);
                if (isFinite(n) && n > 0) {
                    amount = n;
                }
            }
            if (!id) {
                continue;
            }
            out[id] = (out[id] || 0) + amount;
        }
        return out;
    }
    function clampItemCountMapToMaxTotal(mapObj, maxTotal) {
        const out = {};
        if (!mapObj || typeof mapObj !== 'object') {
            return out;
        }
        let used = 0;
        const keys = Object.keys(mapObj);
        for (let i = 0; i < keys.length; i++) {
            if (used >= maxTotal) {
                break;
            }
            const k = keys[i];
            const n = Math.max(0, parseInt(mapObj[k], 10) || 0);
            if (!n) {
                continue;
            }
            const take = Math.min(n, maxTotal - used);
            if (take > 0) {
                out[k] = take;
                used += take;
            }
        }
        return out;
    }
    function countMapTotal(mapObj) {
        let total = 0;
        if (!mapObj || typeof mapObj !== 'object') {
            return 0;
        }
        for (const k of Object.keys(mapObj)) {
            total += Math.max(0, parseInt(mapObj[k], 10) || 0);
        }
        return total;
    }
    function parseNonNegativeIntParam(params, keys) {
        const raw = readQueryParam(params, keys);
        if (raw == null) {
            return 0;
        }
        const n = parseInt(String(raw).replace(/,/g, '').replace(/\s/g, ''), 10);
        return isFinite(n) && n >= 0 ? n : 0;
    }
    function getAutoFillConfigFromUrl() {
        const params = new URLSearchParams(window.location.search || '');
        const rotradeAutoFill = readQueryParam(params, ['rotrade_auto_fill', 'rotrade']);
        const legacyAutoFill =
            parseBoolParam(readQueryParam(params, ['rotrade'])) &&
            parseBoolParam(readQueryParam(params, ['auto_fill', 'autofill', 'auto fill']));
        const compactAutoFill =
            params.has('s') || params.has('r') || params.has('s_robux') || params.has('r_robux');
        if (!parseBoolParam(rotradeAutoFill) && !legacyAutoFill && !compactAutoFill) {
            return null;
        }
        const senderRaw = readQueryParam(params, ['itemids_sender', 'itemids sender']);
        const receiverRaw = readQueryParam(params, ['itemids_receiver', 'itemids receiver']);
        const senderCompactRaw = readQueryParam(params, ['s']);
        const receiverCompactRaw = readQueryParam(params, ['r']);
        const senderParsed = Object.assign(
            {},
            parseCompactItemCountList(senderCompactRaw),
            parseItemCountMap(senderRaw)
        );
        const receiverParsed = Object.assign(
            {},
            parseCompactItemCountList(receiverCompactRaw),
            parseItemCountMap(receiverRaw)
        );
        const senderRequestedTotal = countMapTotal(senderParsed);
        const receiverRequestedTotal = countMapTotal(receiverParsed);
        const sender = clampItemCountMapToMaxTotal(senderParsed, 4);
        const receiver = clampItemCountMapToMaxTotal(receiverParsed, 4);
        const senderRobux = parseNonNegativeIntParam(params, ['s_robux']);
        const receiverRobux = parseNonNegativeIntParam(params, ['r_robux']);
        if (
            Object.keys(sender).length === 0 &&
            Object.keys(receiver).length === 0 &&
            !senderRobux &&
            !receiverRobux
        ) {
            return null;
        }
        return {
            sender: sender,
            receiver: receiver,
            senderRequestedTotal: senderRequestedTotal,
            receiverRequestedTotal: receiverRequestedTotal,
            senderOverLimit: senderRequestedTotal > 4,
            receiverOverLimit: receiverRequestedTotal > 4,
            senderRobux: senderRobux,
            receiverRobux: receiverRobux,
        };
    }
    function buildAutoFillSignature(cfg, partnerId) {
        return JSON.stringify({
            p: partnerId || '',
            s: cfg && cfg.sender ? cfg.sender : {},
            r: cfg && cfg.receiver ? cfg.receiver : {},
            s_robux: cfg && cfg.senderRobux ? cfg.senderRobux : 0,
            r_robux: cfg && cfg.receiverRobux ? cfg.receiverRobux : 0,
        });
    }
    function getTradeItemCardIdsNoNormalize(card) {
        const out = [];
        const seen = new Set();
        card.querySelectorAll('[data-rotrade-item-id]').forEach(function (el) {
            const id = String(el.getAttribute('data-rotrade-item-id') || '').trim();
            if (id && !seen.has(id)) {
                seen.add(id);
                out.push(id);
            }
        });
        const collect =
            window.TradeDetailItemIds && window.TradeDetailItemIds.collectItemIdCandidates;
        if (collect) {
            const candidates = collect(card) || [];
            for (let i = 0; i < candidates.length; i++) {
                const id = String(candidates[i] || '').trim();
                if (id && !seen.has(id)) {
                    seen.add(id);
                    out.push(id);
                }
            }
        }
        return out;
    }
    function normalizeTradeItemIdKey(x) {
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (v) {
                      return v == null || v === '' ? null : String(v).trim();
                  };
        const s = String(x || '').trim();
        return normalize(s) || s;
    }
    function remainingKeyMatchesCardIds(wantKey, cardIds) {
        if (!wantKey || !cardIds || !cardIds.length) {
            return false;
        }
        const w = String(wantKey).trim();
        const wNorm = normalizeTradeItemIdKey(w);
        for (let i = 0; i < cardIds.length; i++) {
            const c = String(cardIds[i] || '').trim();
            if (!c) {
                continue;
            }
            if (c === w) {
                return true;
            }
            const cNorm = normalizeTradeItemIdKey(c);
            if (wNorm && cNorm && wNorm === cNorm) {
                return true;
            }
        }
        return false;
    }
    function clickTradeItemCard(card) {
        const thumb = card.querySelector('.item-card-thumb-container');
        if (!thumb) {
            return false;
        }
        thumb.dispatchEvent(
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
            })
        );
        return true;
    }
    function isTradeItemCardHeldOrUnavailable(card) {
        if (!card) {
            return true;
        }
        return !!(
            card.querySelector('.item-card-holding') || card.querySelector('.item-card-equipped')
        );
    }
    function getCardInstanceId(card) {
        const container = card.querySelector(
            '.item-card-container[data-collectibleiteminstanceid]'
        );
        if (!container) {
            return '';
        }
        return String(container.getAttribute('data-collectibleiteminstanceid') || '').trim();
    }
    function getPanelNextButton(panel) {
        return panel.querySelector('.pager-holder .pager-next button');
    }
    function getPanelCurrentPageLabel(panel) {
        const el = panel.querySelector('.pager-holder .ng-binding');
        return el ? String(el.textContent || '').trim() : '';
    }
    function delay(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }
    async function waitForInventoryPanelStable(panel, maxMs) {
        if (!panel || maxMs <= 0) {
            return;
        }
        const started = Date.now();
        while (Date.now() - started < maxMs) {
            if (isInventoryPanelReady(panel)) {
                return;
            }
            await delay(100);
        }
    }
    async function goToNextPageIfPossible(panel) {
        const nextBtn = getPanelNextButton(panel);
        if (!nextBtn || nextBtn.disabled) {
            return false;
        }
        const before = getPanelCurrentPageLabel(panel);
        nextBtn.click();
        const started = Date.now();
        while (Date.now() - started < AUTOFILL_PAGE_TURN_POLL_MS) {
            await delay(AUTOFILL_PAGE_TURN_POLL_STEP_MS);
            const after = getPanelCurrentPageLabel(panel);
            if (after && after !== before) {
                await delay(400);
                await waitForInventoryPanelStable(panel, AUTOFILL_NO_PROGRESS_STABLE_WAIT_MS);
                return true;
            }
        }
        await waitForInventoryPanelStable(panel, AUTOFILL_NO_PROGRESS_EXTRA_STABLE_WAIT_MS);
        return false;
    }
    function totalRemainingCount(rem) {
        let n = 0;
        for (const k of Object.keys(rem)) {
            n += Math.max(0, parseInt(rem[k], 10) || 0);
        }
        return n;
    }
    function panelHasRequestedItems(requested) {
        if (!requested || typeof requested !== 'object') {
            return false;
        }
        return Object.keys(requested).length > 0;
    }
    function isInventoryPanelReady(panel) {
        if (!panel) {
            return false;
        }
        const hasCards =
            panel.querySelectorAll('ul.hlist.item-cards li.trade-item-card').length > 0;
        if (hasCards) {
            return true;
        }
        const spinner = panel.querySelector('.spinner');
        if (spinner && !spinner.classList.contains('ng-hide')) {
            return false;
        }
        const empty = panel.querySelector('.container-empty');
        if (empty && !empty.classList.contains('ng-hide')) {
            return true;
        }
        return false;
    }
    function cloneCountMap(mapObj) {
        const out = {};
        if (!mapObj || typeof mapObj !== 'object') {
            return out;
        }
        for (const k of Object.keys(mapObj)) {
            out[k] = mapObj[k];
        }
        return out;
    }
    function classifyRemainingForPanel(panel, remaining) {
        const held = {};
        const notFound = {};
        const visibleButNotAdded = {};
        if (!panel || !remaining || typeof remaining !== 'object') {
            return {
                held: held,
                notFound: cloneCountMap(remaining),
                visibleButNotAdded: visibleButNotAdded,
            };
        }
        const cards = panel.querySelectorAll('ul.hlist.item-cards li.trade-item-card');
        for (const id of Object.keys(remaining)) {
            const n = Math.max(0, parseInt(remaining[id], 10) || 0);
            if (n <= 0) {
                continue;
            }
            let kind = 'notFound';
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                if (!card) {
                    continue;
                }
                const cardIds = getTradeItemCardIdsNoNormalize(card);
                if (!remainingKeyMatchesCardIds(id, cardIds)) {
                    continue;
                }
                kind = isTradeItemCardHeldOrUnavailable(card) ? 'held' : 'visible';
                break;
            }
            if (kind === 'held') {
                held[id] = n;
            } else if (kind === 'visible') {
                visibleButNotAdded[id] = n;
            } else {
                notFound[id] = n;
            }
        }
        return {
            held: held,
            notFound: notFound,
            visibleButNotAdded: visibleButNotAdded,
        };
    }
    function stripAutoFillParamsFromUrl() {
        try {
            const url = new URL(window.location.href);
            const keys = [
                'rotrade_auto_fill',
                'rotrade',
                'auto_fill',
                'autofill',
                's',
                'r',
                's_robux',
                'r_robux',
                'itemids_sender',
                'itemids_receiver',
                'itemids sender',
                'itemids receiver',
            ];
            let changed = false;
            for (let i = 0; i < keys.length; i++) {
                if (url.searchParams.has(keys[i])) {
                    url.searchParams.delete(keys[i]);
                    changed = true;
                }
            }
            if (changed) {
                const next = url.pathname + (url.search || '') + (url.hash || '');
                window.history.replaceState({}, '', next);
            }
        } catch {}
    }
    function removeAutoFillPopup() {
        const el = document.getElementById(AUTOFILL_POPUP_ID);
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
        if (autoFillPopupEscapeHandler) {
            document.removeEventListener('keydown', autoFillPopupEscapeHandler, true);
            autoFillPopupEscapeHandler = null;
        }
    }
    function ensureAutoFillPopupStyles() {
        if (document.getElementById('rotrade-autofill-popup-styles')) {
            return;
        }
        const style = document.createElement('style');
        style.id = 'rotrade-autofill-popup-styles';
        style.textContent =
            '#' +
            AUTOFILL_POPUP_ID +
            '{box-sizing:border-box;position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.45);font-family:"Builder Sans","Helvetica Neue",Helvetica,Arial,sans-serif;}' +
            '#' +
            AUTOFILL_POPUP_ID +
            ' .rotrade-autofill-popup-dialog{box-sizing:border-box;position:relative;max-width:480px;width:100%;max-height:min(80vh,640px);overflow:auto;padding:18px 40px 18px 18px;border-radius:10px;font-size:14px;line-height:1.45;box-shadow:0 10px 40px rgba(0,0,0,.35);}' +
            'body.dark-theme #' +
            AUTOFILL_POPUP_ID +
            ' .rotrade-autofill-popup-dialog{background:rgb(38,40,45);border:1px solid rgba(255,255,255,.12);color:rgb(247,247,248);}' +
            'body:not(.dark-theme) #' +
            AUTOFILL_POPUP_ID +
            ' .rotrade-autofill-popup-dialog{background:#fffbeb;border:1px solid #fbbf24;color:#78350f;}' +
            '#' +
            AUTOFILL_POPUP_ID +
            ' .rotrade-autofill-popup-title{font-weight:700;margin-bottom:8px;padding-right:8px;}' +
            '#' +
            AUTOFILL_POPUP_ID +
            ' .rotrade-autofill-popup-body{margin:0 0 8px 0;}' +
            '#' +
            AUTOFILL_POPUP_ID +
            ' .rotrade-autofill-popup-list{margin:8px 0 0 18px;padding:0;}' +
            '#' +
            AUTOFILL_POPUP_ID +
            ' .rotrade-autofill-popup-dismiss{position:absolute;top:10px;right:10px;border:0;background:transparent;cursor:pointer;font-size:20px;line-height:1;padding:6px;opacity:.75;color:inherit;}' +
            '#' +
            AUTOFILL_POPUP_ID +
            ' .rotrade-autofill-popup-dismiss:hover{opacity:1;}';
        document.head.appendChild(style);
    }
    function showAutoFillResultPopup(payload) {
        ensureAutoFillPopupStyles();
        removeAutoFillPopup();
        const overlay = document.createElement('div');
        overlay.id = AUTOFILL_POPUP_ID;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'rotrade-autofill-popup-title-el');
        const dialog = document.createElement('div');
        dialog.className = 'rotrade-autofill-popup-dialog';
        dialog.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        const title = document.createElement('div');
        title.id = 'rotrade-autofill-popup-title-el';
        title.className = 'rotrade-autofill-popup-title';
        title.textContent = payload.title || 'RoTrade auto-fill';
        const dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.className = 'rotrade-autofill-popup-dismiss';
        dismiss.setAttribute('aria-label', 'Close');
        dismiss.textContent = '×';
        dismiss.addEventListener('click', function () {
            removeAutoFillPopup();
        });
        dialog.appendChild(dismiss);
        dialog.appendChild(title);
        if (payload.body) {
            const body = document.createElement('div');
            body.className = 'rotrade-autofill-popup-body';
            body.textContent = payload.body;
            dialog.appendChild(body);
        }
        if (payload.list && payload.list.length) {
            const ul = document.createElement('ul');
            ul.className = 'rotrade-autofill-popup-list';
            for (let i = 0; i < payload.list.length; i++) {
                const li = document.createElement('li');
                li.textContent = payload.list[i];
                ul.appendChild(li);
            }
            dialog.appendChild(ul);
        }
        overlay.appendChild(dialog);
        overlay.addEventListener('click', function () {
            removeAutoFillPopup();
        });
        document.body.appendChild(overlay);
        autoFillPopupEscapeHandler = function (e) {
            if (e.key === 'Escape') {
                removeAutoFillPopup();
            }
        };
        document.addEventListener('keydown', autoFillPopupEscapeHandler, true);
        try {
            dismiss.focus();
        } catch {}
    }
    function rolimonNameFromItemArray(arr) {
        if (!Array.isArray(arr) || arr.length < 1) {
            return null;
        }
        const name = arr[0];
        if (name == null || name === '') {
            return null;
        }
        const s = String(name).trim();
        return s || null;
    }
    function pairForUrlItemId(rawId) {
        const raw = String(rawId || '').trim();
        if (!raw) {
            return null;
        }
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        const n = normalize(raw) || raw;
        return {
            rawItemId: raw,
            itemId: n,
        };
    }
    function formatIdCountMap(mapObj, items) {
        const parts = [];
        if (!mapObj || typeof mapObj !== 'object') {
            return parts;
        }
        const lookup =
            window.TradeDetailItemIds && window.TradeDetailItemIds.lookupRolimonArrayForTradeItem;
        for (const k of Object.keys(mapObj)) {
            const n = Math.max(0, parseInt(mapObj[k], 10) || 0);
            if (n > 0 && k) {
                let label = String(k);
                const pair = pairForUrlItemId(k);
                if (lookup && items && pair) {
                    const arr = lookup(items, pair);
                    const name = rolimonNameFromItemArray(arr);
                    if (name) {
                        label = name;
                    }
                }
                parts.push(label + (n > 1 ? ' ×' + n : ''));
            }
        }
        return parts;
    }
    function collectInvalidRequestedItemIds(mapObj, items) {
        const invalid = [];
        if (!mapObj || typeof mapObj !== 'object') {
            return invalid;
        }
        const lookup =
            window.TradeDetailItemIds && window.TradeDetailItemIds.lookupRolimonArrayForTradeItem;
        if (typeof lookup !== 'function' || !items || typeof items !== 'object') {
            return invalid;
        }
        for (const k of Object.keys(mapObj)) {
            const n = Math.max(0, parseInt(mapObj[k], 10) || 0);
            if (n <= 0) {
                continue;
            }
            const pair = pairForUrlItemId(k);
            const arr = pair ? lookup(items, pair) : null;
            if (!rolimonNameFromItemArray(arr)) {
                invalid.push(String(k));
            }
        }
        return invalid;
    }
    async function resolveRolimonsItemsForLabels() {
        const ids = window.TradeDetailItemIds;
        const getRaw = ids && ids.getRolimonItemsRaw;
        if (typeof getRaw === 'function') {
            try {
                const items = await getRaw();
                if (items && typeof items === 'object') {
                    return items;
                }
            } catch {}
        }
        try {
            if (typeof window.rolimonData === 'object' && window.rolimonData) {
                return window.rolimonData;
            }
        } catch {}
        return {};
    }
    async function summarizeAutoFillResult(senderRes, receiverRes, items) {
        const lines = [];
        function addSide(label, res) {
            if (!res) {
                return;
            }
            if (res.noPanel) {
                lines.push(
                    label +
                        ' — inventory panel missing. Reload this trade page and try again. Requested: ' +
                        formatIdCountMap(res.wanted || res.remaining, items).join(', ') +
                        '.'
                );
                return;
            }
            if (!res.remaining || totalRemainingCount(res.remaining) <= 0) {
                return;
            }
            const cls = classifyRemainingForPanel(res.panel, res.remaining);
            const held = formatIdCountMap(cls.held, items);
            const nf = formatIdCountMap(cls.notFound, items);
            const vis = formatIdCountMap(cls.visibleButNotAdded || {}, items);
            if (held.length) {
                lines.push(label + ' — on hold / unavailable: ' + held.join(', ') + '.');
            }
            if (vis.length) {
                lines.push(
                    label +
                        ' — visible in the grid but not added (click manually or reload): ' +
                        vis.join(', ') +
                        '.'
                );
            }
            if (nf.length) {
                lines.push(
                    label + ' — not seen on inventory pages searched: ' + nf.join(', ') + '.'
                );
            }
            if (res.pageCapHit) {
                lines.push(label + ' — stopped after ' + AUTOFILL_MAX_PAGE_TURNS + ' pages.');
            }
        }
        addSide('Your inventory', senderRes);
        addSide('Their inventory', receiverRes);
        return lines;
    }
    async function autofillScanVisibleCardsOnce(
        panel,
        remaining,
        selectedInstanceIds,
        clickedCards,
        settleMs
    ) {
        let progress = false;
        const cards = panel.querySelectorAll('ul.hlist.item-cards li.trade-item-card');
        for (let i = 0; i < cards.length; i++) {
            if (totalRemainingCount(remaining) <= 0) {
                break;
            }
            const card = cards[i];
            if (!card || isTradeItemCardHeldOrUnavailable(card)) {
                continue;
            }
            if (clickedCards.has(card)) {
                continue;
            }
            const instanceId = getCardInstanceId(card);
            if (instanceId && selectedInstanceIds.has(instanceId)) {
                continue;
            }
            const ids = getTradeItemCardIdsNoNormalize(card);
            let matchedKey = null;
            for (const rk of Object.keys(remaining)) {
                if ((remaining[rk] || 0) <= 0) {
                    continue;
                }
                if (remainingKeyMatchesCardIds(rk, ids)) {
                    matchedKey = rk;
                    break;
                }
            }
            if (!matchedKey) {
                continue;
            }
            if (clickTradeItemCard(card)) {
                progress = true;
                clickedCards.add(card);
                remaining[matchedKey] = Math.max(0, (remaining[matchedKey] || 0) - 1);
                if (instanceId) {
                    selectedInstanceIds.add(instanceId);
                }
                await delay(settleMs);
            }
        }
        return progress;
    }
    async function autofillSettleRetries(panel, remaining, selectedInstanceIds, clickedCards) {
        if (totalRemainingCount(remaining) <= 0) {
            return;
        }
        await delay(AUTOFILL_PRE_FAILURE_SETTLE_MS);
        for (
            let r = 0;
            r < AUTOFILL_SETTLE_RETRY_PASSES && totalRemainingCount(remaining) > 0;
            r++
        ) {
            const progress = await autofillScanVisibleCardsOnce(
                panel,
                remaining,
                selectedInstanceIds,
                clickedCards,
                AUTOFILL_CLICK_SETTLE_MS
            );
            if (totalRemainingCount(remaining) <= 0) {
                break;
            }
            if (!progress) {
                break;
            }
            await delay(AUTOFILL_SETTLE_RETRY_GAP_MS);
        }
    }
    async function autoFillPanelWithItemCounts(panel, wanted) {
        if (!panel || !wanted || typeof wanted !== 'object') {
            return {
                remaining: {},
                wanted: {},
                panel: panel,
                pageCapHit: false,
            };
        }
        const remaining = {};
        for (const k of Object.keys(wanted)) {
            const id = String(k || '').trim();
            const n = parseInt(wanted[k], 10);
            if (id && isFinite(n) && n > 0) {
                remaining[id] = n;
            }
        }
        const wantedCopy = cloneCountMap(remaining);
        const selectedInstanceIds = new Set();
        const clickedCards = new WeakSet();
        let pageTurns = 0;
        await waitForInventoryPanelStable(panel, AUTOFILL_INITIAL_STABLE_WAIT_MS);
        while (totalRemainingCount(remaining) > 0) {
            let progress = await autofillScanVisibleCardsOnce(
                panel,
                remaining,
                selectedInstanceIds,
                clickedCards,
                AUTOFILL_CLICK_SETTLE_MS
            );
            if (totalRemainingCount(remaining) <= 0) {
                break;
            }
            if (progress) {
                await delay(AUTOFILL_AFTER_PROGRESS_YIELD_MS);
                continue;
            }
            await waitForInventoryPanelStable(panel, AUTOFILL_NO_PROGRESS_STABLE_WAIT_MS);
            progress = await autofillScanVisibleCardsOnce(
                panel,
                remaining,
                selectedInstanceIds,
                clickedCards,
                AUTOFILL_CLICK_SETTLE_MS
            );
            if (totalRemainingCount(remaining) <= 0) {
                break;
            }
            if (progress) {
                await delay(AUTOFILL_AFTER_PROGRESS_YIELD_MS);
                continue;
            }
            for (let extra = 0; extra < AUTOFILL_NO_PROGRESS_EXTRA_SCAN_PASSES; extra++) {
                await delay(AUTOFILL_NO_PROGRESS_EXTRA_GAP_MS);
                await waitForInventoryPanelStable(panel, AUTOFILL_NO_PROGRESS_EXTRA_STABLE_WAIT_MS);
                progress = await autofillScanVisibleCardsOnce(
                    panel,
                    remaining,
                    selectedInstanceIds,
                    clickedCards,
                    AUTOFILL_CLICK_SETTLE_MS
                );
                if (totalRemainingCount(remaining) <= 0) {
                    break;
                }
                if (progress) {
                    break;
                }
            }
            if (totalRemainingCount(remaining) <= 0) {
                break;
            }
            if (progress) {
                await delay(AUTOFILL_AFTER_PROGRESS_YIELD_MS);
                continue;
            }
            if (pageTurns >= AUTOFILL_MAX_PAGE_TURNS) {
                await autofillSettleRetries(panel, remaining, selectedInstanceIds, clickedCards);
                return {
                    remaining: remaining,
                    wanted: wantedCopy,
                    panel: panel,
                    pageCapHit: totalRemainingCount(remaining) > 0,
                };
            }
            const moved = await goToNextPageIfPossible(panel);
            if (!moved) {
                break;
            }
            pageTurns++;
        }
        await autofillSettleRetries(panel, remaining, selectedInstanceIds, clickedCards);
        return {
            remaining: remaining,
            wanted: wantedCopy,
            panel: panel,
            pageCapHit: false,
        };
    }
    function setRobuxInputOnTradeOffer(input, value) {
        if (!input) {
            return;
        }
        const n = Math.max(0, Math.floor(Number(value) || 0));
        if (n <= 0) {
            return;
        }
        input.focus();
        input.value = String(n);
        input.dispatchEvent(
            new Event('input', {
                bubbles: true,
            })
        );
        input.dispatchEvent(
            new Event('change', {
                bubbles: true,
            })
        );
        try {
            input.dispatchEvent(
                new Event('blur', {
                    bubbles: true,
                })
            );
        } catch {}
    }
    function applyRobuxAutofillFromUrlConfig(root, cfg) {
        if (!cfg || (!cfg.senderRobux && !cfg.receiverRobux)) {
            return;
        }
        const offers = root.querySelectorAll('.trade-request-window-offer');
        const sr = Math.max(0, Math.floor(Number(cfg.senderRobux) || 0));
        const rr = Math.max(0, Math.floor(Number(cfg.receiverRobux) || 0));
        if (offers.length >= 1 && sr > 0) {
            const inp = offers[0].querySelector('input[name="robux"]');
            setRobuxInputOnTradeOffer(inp, sr);
        }
        if (offers.length >= 2 && rr > 0) {
            const inp = offers[1].querySelector('input[name="robux"]');
            setRobuxInputOnTradeOffer(inp, rr);
        }
    }
    async function runTradeUrlAutoFill(root) {
        const cfg = getAutoFillConfigFromUrl();
        if (!cfg) {
            return;
        }
        const partnerId = S.resolvePartnerUserId(root);
        const sig = buildAutoFillSignature(cfg, partnerId);
        if (autoFillInFlight || (lastAutoFillSignature && lastAutoFillSignature === sig)) {
            return;
        }
        const senderPanel = S.findRequesterInventoryPanel(root);
        const receiverPanel = S.findPartnerInventoryPanel(root);
        if (!senderPanel && !receiverPanel) {
            return;
        }
        const senderItemsNeeded = panelHasRequestedItems(cfg.sender);
        const receiverItemsNeeded = panelHasRequestedItems(cfg.receiver);
        if (
            (senderItemsNeeded && !isInventoryPanelReady(senderPanel)) ||
            (receiverItemsNeeded && !isInventoryPanelReady(receiverPanel))
        ) {
            return;
        }
        const itemsForValidation = await resolveRolimonsItemsForLabels();
        if (cfg.senderOverLimit || cfg.receiverOverLimit) {
            const lines = [];
            if (cfg.senderOverLimit) {
                lines.push(
                    'Your inventory — requested ' + cfg.senderRequestedTotal + ' items, max is 4.'
                );
            }
            if (cfg.receiverOverLimit) {
                lines.push(
                    'Their inventory — requested ' +
                        cfg.receiverRequestedTotal +
                        ' items, max is 4.'
                );
            }
            showAutoFillResultPopup({
                title: 'RoTrade: request rejected',
                body: 'Too many requested items. Nothing was selected.',
                list: lines,
            });
            stripAutoFillParamsFromUrl();
            lastAutoFillSignature = sig;
            return;
        }
        const invalidSender = collectInvalidRequestedItemIds(cfg.sender, itemsForValidation);
        const invalidReceiver = collectInvalidRequestedItemIds(cfg.receiver, itemsForValidation);
        if (invalidSender.length || invalidReceiver.length) {
            const lines = [];
            if (invalidSender.length) {
                lines.push(
                    'Your inventory — invalid item id(s): ' + invalidSender.join(', ') + '.'
                );
            }
            if (invalidReceiver.length) {
                lines.push(
                    'Their inventory — invalid item id(s): ' + invalidReceiver.join(', ') + '.'
                );
            }
            showAutoFillResultPopup({
                title: 'RoTrade: request rejected',
                body: 'One or more item IDs are invalid. Nothing was selected.',
                list: lines,
            });
            stripAutoFillParamsFromUrl();
            lastAutoFillSignature = sig;
            return;
        }
        autoFillInFlight = true;
        let senderRes = null;
        let receiverRes = null;
        try {
            if (senderItemsNeeded && !senderPanel) {
                senderRes = {
                    remaining: cloneCountMap(cfg.sender),
                    wanted: cloneCountMap(cfg.sender),
                    panel: null,
                    pageCapHit: false,
                    noPanel: true,
                };
            } else if (senderPanel && senderItemsNeeded) {
                senderRes = await autoFillPanelWithItemCounts(senderPanel, cfg.sender);
            }
            if (receiverItemsNeeded && !receiverPanel) {
                receiverRes = {
                    remaining: cloneCountMap(cfg.receiver),
                    wanted: cloneCountMap(cfg.receiver),
                    panel: null,
                    pageCapHit: false,
                    noPanel: true,
                };
            } else if (receiverPanel && receiverItemsNeeded) {
                receiverRes = await autoFillPanelWithItemCounts(receiverPanel, cfg.receiver);
            }
            await delay(200);
            applyRobuxAutofillFromUrlConfig(root, cfg);
            lastAutoFillSignature = sig;
            const senderLeft = senderRes && totalRemainingCount(senderRes.remaining) > 0;
            const receiverLeft = receiverRes && totalRemainingCount(receiverRes.remaining) > 0;
            const anyIssue =
                (senderRes && senderRes.noPanel) ||
                (receiverRes && receiverRes.noPanel) ||
                senderLeft ||
                receiverLeft ||
                (senderRes && senderRes.pageCapHit) ||
                (receiverRes && receiverRes.pageCapHit);
            if (anyIssue) {
                const items = itemsForValidation;
                const summaryLines = await summarizeAutoFillResult(senderRes, receiverRes, items);
                showAutoFillResultPopup({
                    title: 'RoTrade: some items were not selected',
                    body: 'Could not select every requested item. Check the list below, then adjust filters/items and run again. The URL trigger was removed from this page.',
                    list: summaryLines,
                });
            }
            stripAutoFillParamsFromUrl();
        } finally {
            autoFillInFlight = false;
        }
    }
    window.TradeRequestWishlistAutofill = {
        runTradeUrlAutoFill: runTradeUrlAutoFill,
    };
})();
