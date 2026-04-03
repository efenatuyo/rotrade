(function () {
    'use strict';
    const S = window.TradeRequestWishlistShared;
    const DEBOUNCE_MS = 120;
    const BADGE_CLASS = 'rotrade-wishlist-op-badge';
    const THUMB_BADGES_CLASS = 'rotrade-trade-thumb-badges';
    const ASKING_ROW_CLASS = 'rotrade-asking-badges-row';
    const ICON_BADGE_CLASS = 'rotrade-asking-icon-badge';
    const VALUE_BADGE_CLASS = 'rotrade-asking-value-badge';
    const THUMB_PROOF_ATTR = 'data-rotrade-trade-thumb-proof';
    const TOOLTIP_WISHLIST = 'This user added this item to their wishlist on Rolimons.';
    const TOOLTIP_NFT_ASKING_LIST =
        'This item is marked not for trade on Rolimons (asking list: NFT).';
    const TOOLTIP_OVERPAY = 'They marked this item as overpay on their Rolimons asking list.';
    const TOOLTIP_UPGRADE = 'They marked this item as upgrade on their Rolimons asking list.';
    const TOOLTIP_EQUAL = 'They marked this item as equal on their Rolimons asking list.';
    const TOOLTIP_DOWNGRADE = 'They marked this item as downgrade on their Rolimons asking list.';
    const TOOLTIP_LOWBALL = 'They marked this item as lowball on their Rolimons asking list.';
    let debounceTimer = null;
    let domObserver = null;
    let routeObserver = null;
    let suppressTradeRequestDomObserver = false;
    let lastAugmentContentSnapshot = null;
    let tradeRequestAugmentInflight = false;
    function computeTradeRequestContentSnapshot(root) {
        root = root || S.findTradeAppRoot();
        if (!root) {
            return '';
        }
        const parts = [];
        parts.push('partner:' + (S.resolvePartnerUserId(root) || ''));
        root.querySelectorAll('.trade-inventory-panel').forEach(function (panel, pi) {
            const filterLab = panel.querySelector('.inventory-type-dropdown .rbx-selection-label');
            const pageLab = panel.querySelector('.pager-holder .ng-binding');
            const filterText = filterLab ? (filterLab.textContent || '').trim() : '';
            const pageText = pageLab ? (pageLab.textContent || '').trim() : '';
            const ids = [];
            panel.querySelectorAll('ul.hlist.item-cards li.trade-item-card').forEach(function (li) {
                const c = li.querySelector('[data-collectibleiteminstanceid]');
                ids.push(c ? c.getAttribute('data-collectibleiteminstanceid') || '' : '');
            });
            parts.push('inv' + pi + ':' + filterText + ':' + pageText + ':' + ids.join(','));
        });
        root.querySelectorAll('.trade-request-window-offer').forEach(function (off, i) {
            const slots = [];
            off.querySelectorAll('.trade-request-item').forEach(function (s) {
                if (s.classList.contains('blank-item')) {
                    return;
                }
                slots.push(s.getAttribute('data-collectibleiteminstanceid') || '');
            });
            const robux = off.querySelector('input[name="robux"]');
            parts.push(
                'offer' + i + ':' + slots.join('|') + ':' + (robux ? String(robux.value || '') : '')
            );
        });
        return parts.join('||');
    }
    function recordIsRelevantTradeRequestMutation(record, root) {
        if (!record || !root) {
            return false;
        }
        const t = record.target;
        if (!t || !root.contains(t)) {
            return false;
        }
        if (record.type === 'attributes') {
            if (t.nodeName === 'INPUT' && t.getAttribute('name') === 'robux') {
                return true;
            }
            if (
                record.attributeName === 'class' &&
                t.closest &&
                (t.closest('li.trade-item-card') || t.closest('.trade-request-item'))
            ) {
                return true;
            }
            return false;
        }
        if (record.type === 'characterData') {
            let el = t;
            if (el.nodeType === 3) {
                el = el.parentElement;
            }
            return !!(
                el &&
                el.closest &&
                (el.closest('.pager-holder') ||
                    el.closest('ul.hlist.item-cards') ||
                    el.closest('.trade-request-window-offer'))
            );
        }
        if (record.type === 'childList') {
            const relevantSelector =
                'ul.hlist.item-cards, .trade-request-window-offer, .pager-holder, .trade-inventory-panel';
            if (t.nodeType === 1 && t.matches && t.matches(relevantSelector)) {
                return true;
            }
            if (t.closest) {
                return !!t.closest(relevantSelector);
            }
        }
        return false;
    }
    function bindTradeRequestDirectHandlers(root) {
        if (!root || root.__rotradeTrDirectHandlers) {
            return;
        }
        root.__rotradeTrDirectHandlers = true;
        root.addEventListener(
            'click',
            function (e) {
                if (!S.isTradeRequestFlowPage() || suppressTradeRequestDomObserver) {
                    return;
                }
                const el = e.target;
                if (!el || !el.closest) {
                    return;
                }
                if (
                    el.closest('.pager-holder button') ||
                    el.closest('.inventory-type-dropdown a') ||
                    el.closest('.inventory-type-dropdown .input-dropdown-btn')
                ) {
                    schedule();
                }
            },
            true
        );
        root.addEventListener(
            'input',
            function (e) {
                if (!S.isTradeRequestFlowPage() || suppressTradeRequestDomObserver) {
                    return;
                }
                const inp = e.target;
                if (inp && inp.getAttribute && inp.getAttribute('name') === 'robux') {
                    schedule();
                }
            },
            true
        );
    }
    function buildWishlistIdSet(stats) {
        const wish = stats && stats.wishlist && stats.wishlist.asset_ids;
        if (!Array.isArray(wish)) {
            return new Set();
        }
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        const set = new Set();
        for (let i = 0; i < wish.length; i++) {
            const id = wish[i];
            set.add(String(id));
            const n = normalize(id);
            if (n) {
                set.add(String(n));
            }
        }
        return set;
    }
    function getNormalizeAndAutoIds() {
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        const itemIdForAuto =
            window.TradeItemIdAliases && window.TradeItemIdAliases.itemIdForAutoInstanceApi
                ? window.TradeItemIdAliases.itemIdForAutoInstanceApi.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        return {
            normalize: normalize,
            itemIdForAuto: itemIdForAuto,
        };
    }
    function expandAssetIdKeysForPrefs(id) {
        const keys = [];
        const seen = {};
        function add(k) {
            if (k == null || k === '') {
                return;
            }
            const s = String(k);
            if (seen[s]) {
                return;
            }
            seen[s] = true;
            keys.push(s);
        }
        const na = getNormalizeAndAutoIds();
        const normalize = na.normalize;
        const itemIdForAuto = na.itemIdForAuto;
        add(id);
        const n = normalize(id);
        if (n) {
            add(n);
        }
        const auto = itemIdForAuto(id);
        if (auto != null && auto !== '') {
            add(auto);
            const na2 = normalize(auto);
            if (na2) {
                add(na2);
            }
        }
        return keys;
    }
    function parseAskingValueField(v) {
        if (v === undefined || v === null || v === '') {
            return null;
        }
        const n = typeof v === 'number' ? v : Number(String(v).trim());
        if (!isFinite(n) || n <= 0) {
            return null;
        }
        return n;
    }
    function extractAskingMetaFromRow(row) {
        if (!row || typeof row !== 'object') {
            return null;
        }
        const askingStr = String(row.asking || '')
            .trim()
            .toLowerCase();
        const nftLegacy = askingStr === 'nft' || askingStr === 'not_for_trade';
        const valueNum = parseAskingValueField(row.value);
        return {
            value: valueNum,
            nft: !!(row.nft || nftLegacy),
            overpay: !!row.overpay,
            upgrade: !!row.upgrade,
            equal: !!row.equal,
            downgrade: !!row.downgrade,
            lowball: !!row.lowball,
        };
    }
    function rowHasAnyAskingBadge(meta) {
        if (!meta) {
            return false;
        }
        return (
            (meta.value != null && meta.value > 0) ||
            meta.nft ||
            meta.overpay ||
            meta.upgrade ||
            meta.equal ||
            meta.downgrade ||
            meta.lowball
        );
    }
    function buildAskingRowMap(prefs) {
        const map = new Map();
        const al = prefs && prefs.asking_list;
        const assets = al && al.assets;
        if (!Array.isArray(assets)) {
            return map;
        }
        for (let i = 0; i < assets.length; i++) {
            const row = assets[i];
            if (!row || row.id == null || row.id === '') {
                continue;
            }
            const meta = extractAskingMetaFromRow(row);
            if (!rowHasAnyAskingBadge(meta)) {
                continue;
            }
            const keys = expandAssetIdKeysForPrefs(row.id);
            for (let k = 0; k < keys.length; k++) {
                map.set(keys[k], meta);
            }
        }
        return map;
    }
    function findAskingMetaForCard(card, rowMap) {
        if (!rowMap || rowMap.size === 0) {
            return null;
        }
        const collect =
            window.TradeDetailItemIds && window.TradeDetailItemIds.collectItemIdCandidates;
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return String(x).trim();
                  };
        const candidates = collect ? collect(card) : [];
        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            if (rowMap.has(String(c))) {
                return rowMap.get(String(c));
            }
            const n = normalize(c);
            if (n && rowMap.has(String(n))) {
                return rowMap.get(String(n));
            }
        }
        return null;
    }
    function cardMatchesWishlist(card, wishSet) {
        if (!wishSet || wishSet.size === 0) {
            return false;
        }
        const collect =
            window.TradeDetailItemIds && window.TradeDetailItemIds.collectItemIdCandidates;
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return String(x).trim();
                  };
        const candidates = collect ? collect(card) : [];
        if (candidates.length === 0) {
            return false;
        }
        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            if (wishSet.has(String(c))) {
                return true;
            }
            const n = normalize(c);
            if (n && wishSet.has(String(n))) {
                return true;
            }
        }
        return false;
    }
    function removeBadgesInPanel(panel) {
        if (!panel) {
            return;
        }
        panel.querySelectorAll('.' + THUMB_BADGES_CLASS).forEach(function (el) {
            el.remove();
        });
        panel
            .querySelectorAll('.item-card-thumb-container [' + THUMB_PROOF_ATTR + ']')
            .forEach(function (el) {
                el.remove();
            });
    }
    function attachThumbProofLink(card) {
        const thumb = card.querySelector('.item-card-thumb-container');
        if (!thumb) {
            return;
        }
        const old = thumb.querySelector('[' + THUMB_PROOF_ATTR + ']');
        if (old) {
            old.remove();
        }
        if (!window.ProofsLinkDOM || !window.ProofsLinkExtractor || !window.ProofsLinkConfig) {
            return;
        }
        try {
            window.ProofsLinkDOM.addProofsLinkStyles();
        } catch {}
        const itemId = window.ProofsLinkExtractor.extractItemId(card);
        if (!itemId) {
            return;
        }
        const itemName = window.ProofsLinkExtractor.extractItemName(card);
        const link = window.ProofsLinkDOM.createProofsLink(itemId, itemName);
        if (!link) {
            return;
        }
        link.setAttribute(THUMB_PROOF_ATTR, '1');
        link.style.top = 'auto';
        link.style.bottom = '6px';
        link.style.right = '6px';
        link.style.left = 'auto';
        link.style.zIndex = '14';
        try {
            thumb.appendChild(link);
        } catch {}
    }
    function formatCompactValueLabel(num) {
        const n = Math.round(Number(num));
        if (!isFinite(n)) {
            return '';
        }
        const neg = n < 0;
        const v = Math.abs(n);
        function prefix(s) {
            return (neg ? '-' : '') + s;
        }
        if (v < 1e3) {
            return prefix(String(v));
        }
        if (v < 1e6) {
            const k = v / 1e3;
            const t = k >= 100 ? String(Math.round(k)) : String(Math.round(k * 10) / 10);
            return prefix(t + 'k');
        }
        if (v < 1e9) {
            const m = v / 1e6;
            const t = m >= 100 ? String(Math.round(m)) : String(Math.round(m * 10) / 10);
            return prefix(t + 'm');
        }
        const b = v / 1e9;
        const t = b >= 100 ? String(Math.round(b)) : String(Math.round(b * 10) / 10);
        return prefix(t + 'b');
    }
    function createIconBadge(fileName, tooltip) {
        let url;
        try {
            url = chrome.runtime.getURL('assets/icons/' + fileName);
        } catch {
            return null;
        }
        const wrap = document.createElement('span');
        wrap.className = ICON_BADGE_CLASS;
        wrap.setAttribute('title', tooltip);
        wrap.setAttribute('aria-label', tooltip);
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.draggable = false;
        wrap.appendChild(img);
        return wrap;
    }
    function createValueBadge(value) {
        const label = formatCompactValueLabel(value);
        if (!label) {
            return null;
        }
        const wrap = document.createElement('span');
        wrap.className = VALUE_BADGE_CLASS;
        wrap.textContent = label;
        wrap.setAttribute(
            'title',
            'Target Rolimons value on their asking list (RoTrade): ' + label + '.'
        );
        wrap.setAttribute('aria-label', wrap.getAttribute('title'));
        return wrap;
    }
    function mountTradeThumbBadges(card, askingMeta, showWishlist) {
        const thumb = card.querySelector('.item-card-thumb-container');
        if (!thumb) {
            return;
        }
        const existing = thumb.querySelector('.' + THUMB_BADGES_CLASS);
        if (existing) {
            existing.remove();
        }
        const hasAsking = askingMeta && rowHasAnyAskingBadge(askingMeta);
        if (!hasAsking && !showWishlist) {
            return;
        }
        const outer = document.createElement('div');
        outer.className = THUMB_BADGES_CLASS;
        if (hasAsking) {
            const row = document.createElement('div');
            row.className = ASKING_ROW_CLASS;
            if (askingMeta.value != null && askingMeta.value > 0) {
                const vb = createValueBadge(askingMeta.value);
                if (vb) {
                    row.appendChild(vb);
                }
            }
            const iconDefs = [
                ['nft', 'nft.svg', TOOLTIP_NFT_ASKING_LIST],
                ['overpay', 'op.svg', TOOLTIP_OVERPAY],
                ['upgrade', 'upgrade.svg', TOOLTIP_UPGRADE],
                ['equal', 'equal.svg', TOOLTIP_EQUAL],
                ['downgrade', 'downgrade.svg', TOOLTIP_DOWNGRADE],
                ['lowball', 'lb.svg', TOOLTIP_LOWBALL],
            ];
            for (let i = 0; i < iconDefs.length; i++) {
                if (askingMeta[iconDefs[i][0]]) {
                    const el = createIconBadge(iconDefs[i][1], iconDefs[i][2]);
                    if (el) {
                        row.appendChild(el);
                    }
                }
            }
            outer.appendChild(row);
        }
        if (showWishlist) {
            let url;
            try {
                url = chrome.runtime.getURL('assets/icons/wish.svg');
            } catch {
                url = null;
            }
            if (url) {
                const wrap = document.createElement('span');
                wrap.className = BADGE_CLASS;
                wrap.setAttribute('title', TOOLTIP_WISHLIST);
                wrap.setAttribute('aria-label', TOOLTIP_WISHLIST);
                const img = document.createElement('img');
                img.src = url;
                img.alt = '';
                img.draggable = false;
                wrap.appendChild(img);
                outer.appendChild(wrap);
            }
        }
        thumb.appendChild(outer);
    }
    function ensureBadgeStyles() {
        if (document.getElementById('rotrade-wishlist-op-styles')) {
            return;
        }
        const style = document.createElement('style');
        style.id = 'rotrade-wishlist-op-styles';
        style.textContent =
            '.rotrade-wishlist-op-requester .item-card-thumb-container,.rotrade-partner-asking-badges .item-card-thumb-container{position:relative}' +
            '.' +
            THUMB_BADGES_CLASS +
            '{position:absolute;top:6px;left:6px;z-index:12;display:flex;flex-direction:column;align-items:flex-start;gap:4px;pointer-events:none;max-width:calc(100% - 10px);}' +
            '.' +
            THUMB_BADGES_CLASS +
            '>*{pointer-events:auto;}' +
            '.' +
            ASKING_ROW_CLASS +
            '{display:flex;flex-wrap:wrap;flex-direction:row;align-items:center;gap:4px;}' +
            '.' +
            VALUE_BADGE_CLASS +
            '{box-sizing:border-box;min-width:20px;height:20px;padding:0 5px;border-radius:10px;font-size:10px;font-weight:700;line-height:20px;text-align:center;white-space:nowrap;box-shadow:0 0 0 1px rgba(0,0,0,.12);}' +
            'body.dark-theme .' +
            VALUE_BADGE_CLASS +
            '{background:rgba(38,40,45,.95);color:rgb(247,247,248);}' +
            'body:not(.dark-theme) .' +
            VALUE_BADGE_CLASS +
            '{background:#fff;color:rgb(32,34,39);}' +
            '.' +
            ICON_BADGE_CLASS +
            '{flex-shrink:0;width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.15);}' +
            '.' +
            ICON_BADGE_CLASS +
            ' img{width:100%;height:100%;display:block;border-radius:50%;object-fit:contain;pointer-events:none;}' +
            '.' +
            BADGE_CLASS +
            '{flex-shrink:0;width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.15);}' +
            '.' +
            BADGE_CLASS +
            ' img{width:100%;height:100%;display:block;border-radius:50%;pointer-events:none;}' +
            '#trades-web-app .item-card-thumb-container .proofs-link-container[' +
            THUMB_PROOF_ATTR +
            ']{top:auto!important;bottom:6px!important;right:6px!important;left:auto!important;}' +
            '#trades-web-app .rotrade-wishlist-op-requester ul.hlist.item-cards > li.trade-item-card,' +
            '#trades-web-app .rotrade-wishlist-op-requester ul.hlist.item-cards > li.trade-item-card .item-card-container,' +
            '#trades-web-app .rotrade-wishlist-op-requester ul.hlist.item-cards > li.trade-item-card .item-card-link,' +
            '#trades-web-app .rotrade-wishlist-op-requester ul.hlist.item-cards > li.trade-item-card .item-card-caption,' +
            '#trades-web-app .rotrade-partner-asking-badges ul.hlist.item-cards > li.trade-item-card,' +
            '#trades-web-app .rotrade-partner-asking-badges ul.hlist.item-cards > li.trade-item-card .item-card-container,' +
            '#trades-web-app .rotrade-partner-asking-badges ul.hlist.item-cards > li.trade-item-card .item-card-link,' +
            '#trades-web-app .rotrade-partner-asking-badges ul.hlist.item-cards > li.trade-item-card .item-card-caption,' +
            '#trades-web-app .rotrade-trade-inv-augmented ul.hlist.item-cards > li.trade-item-card,' +
            '#trades-web-app .rotrade-trade-inv-augmented ul.hlist.item-cards > li.trade-item-card .item-card-container,' +
            '#trades-web-app .rotrade-trade-inv-augmented ul.hlist.item-cards > li.trade-item-card .item-card-link,' +
            '#trades-web-app .rotrade-trade-inv-augmented ul.hlist.item-cards > li.trade-item-card .item-card-caption{height:auto!important;max-height:none!important;overflow:visible!important;}' +
            '#trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values,#trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values{display:flex;flex-direction:column;gap:8px;width:100%;margin-top:6px;min-height:min-content;box-sizing:border-box;overflow:visible!important;}' +
            '#trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values .rotrade-row,#trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values .rotrade-row{display:flex;flex-wrap:wrap;align-items:center;width:100%;min-height:min-content;overflow:visible!important;}' +
            '#trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values .rotrade-row-usd .valueSpan.text-robux,#trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values .rotrade-row-usd .valueSpan.text-robux{color:rgb(247,247,248);}' +
            'body:not(.dark-theme) #trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values .rotrade-row-usd .valueSpan.text-robux,body:not(.dark-theme) #trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values .rotrade-row-usd .valueSpan.text-robux{color:rgb(32,34,39);}' +
            '#trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values .rotrade-row-rolimons .valueSpan.text-robux[data-rotrade-synthetic],#trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values .rotrade-row-rolimons .valueSpan.text-robux[data-rotrade-synthetic]{color:#fff;font-weight:700;}' +
            'body:not(.dark-theme) #trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values .rotrade-row-rolimons .valueSpan.text-robux[data-rotrade-synthetic],body:not(.dark-theme) #trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values .rotrade-row-rolimons .valueSpan.text-robux[data-rotrade-synthetic]{color:rgb(32,34,39);}' +
            '#trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values a.rotrade-caption-rolimons-value-link,#trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values a.rotrade-caption-usd-value-link,#trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values a.rotrade-caption-rolimons-value-link,#trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values a.rotrade-caption-usd-value-link{color:inherit;text-decoration:none;cursor:pointer;}' +
            '#trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values a.rotrade-caption-rolimons-value-link:hover,#trades-web-app .rotrade-wishlist-op-requester .rotrade-caption-values a.rotrade-caption-usd-value-link:hover,#trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values a.rotrade-caption-rolimons-value-link:hover,#trades-web-app .rotrade-trade-inv-augmented .rotrade-caption-values a.rotrade-caption-usd-value-link:hover{text-decoration:underline;}' +
            '#trades-web-app .trade-request-window-offer .robux-line .robux-line-amount{display:inline-block;vertical-align:top;text-align:right;}' +
            '#trades-web-app .trade-request-window-offer [data-rotrade-trade-request-offer-totals] .valueSpan.text-robux-lg{color:rgb(247,247,248);}' +
            'body:not(.dark-theme) #trades-web-app .trade-request-window-offer [data-rotrade-trade-request-offer-totals] .valueSpan.text-robux-lg{color:rgb(32,34,39);}';
        document.head.appendChild(style);
    }
    function applyBadges(panel, wishSet, askingRowMap) {
        askingRowMap = askingRowMap || new Map();
        removeBadgesInPanel(panel);
        if (!panel) {
            return;
        }
        panel.classList.add('rotrade-wishlist-op-requester');
        panel.querySelectorAll('li.trade-item-card').forEach(function (card) {
            const meta = findAskingMetaForCard(card, askingRowMap);
            const wish = cardMatchesWishlist(card, wishSet);
            mountTradeThumbBadges(card, meta, wish);
            attachThumbProofLink(card);
        });
    }
    function applyPartnerAskingBadges(panel, askingRowMap) {
        askingRowMap = askingRowMap || new Map();
        if (!panel) {
            return;
        }
        removeBadgesInPanel(panel);
        if (askingRowMap.size === 0) {
            panel.classList.remove('rotrade-partner-asking-badges');
            panel.querySelectorAll('li.trade-item-card').forEach(function (card) {
                mountTradeThumbBadges(card, null, false);
                attachThumbProofLink(card);
            });
            return;
        }
        let anyShown = false;
        panel.querySelectorAll('li.trade-item-card').forEach(function (card) {
            const meta = findAskingMetaForCard(card, askingRowMap);
            mountTradeThumbBadges(card, meta, false);
            attachThumbProofLink(card);
            if (meta && rowHasAnyAskingBadge(meta)) {
                anyShown = true;
            }
        });
        if (anyShown) {
            panel.classList.add('rotrade-partner-asking-badges');
        } else {
            panel.classList.remove('rotrade-partner-asking-badges');
        }
    }
    function augmentRequesterInventoryUsd(panel, contentSnapshot) {
        const inject =
            window.TradeDetailItemIds && window.TradeDetailItemIds.injectTradeRequestInventoryUsd;
        if (!inject) {
            return;
        }
        if (tradeRequestAugmentInflight) {
            return;
        }
        tradeRequestAugmentInflight = true;
        suppressTradeRequestDomObserver = true;
        inject(panel)
            .then(function () {
                lastAugmentContentSnapshot = contentSnapshot;
            })
            .catch(function () {})
            .finally(function () {
                tradeRequestAugmentInflight = false;
                suppressTradeRequestDomObserver = false;
            });
    }
    function runWishlistOverlay() {
        if (!S.isTradeRequestFlowPage()) {
            return;
        }
        const root = S.findTradeAppRoot();
        const contentSnapshot = computeTradeRequestContentSnapshot(root);
        window.TradeRequestWishlistAutofill.runTradeUrlAutoFill(root).catch(function () {});
        if (contentSnapshot === lastAugmentContentSnapshot && lastAugmentContentSnapshot !== null) {
            return;
        }
        const ids = window.TradeDetailItemIds;
        const getPrefs = ids && ids.getRolautotradeUserPreferences;
        const partnerId = S.resolvePartnerUserId(root);
        const panel = S.findRequesterInventoryPanel(root);
        const partnerPanel = S.findPartnerInventoryPanel(root);
        if (!getPrefs || !partnerId) {
            if (panel) {
                applyBadges(panel, new Set(), new Map());
            }
            applyPartnerAskingBadges(partnerPanel, new Map());
            augmentRequesterInventoryUsd(panel, contentSnapshot);
            return;
        }
        getPrefs(partnerId)
            .then(function (prefs) {
                if (!S.isTradeRequestFlowPage()) {
                    return;
                }
                const rootNow = S.findTradeAppRoot();
                if (S.resolvePartnerUserId(rootNow) !== partnerId) {
                    return;
                }
                const snapNow = computeTradeRequestContentSnapshot(rootNow);
                const panelNow = S.findRequesterInventoryPanel(rootNow);
                const partnerPanelNow = S.findPartnerInventoryPanel(rootNow);
                const wishSet = buildWishlistIdSet(prefs);
                const askingRowMap = buildAskingRowMap(prefs);
                if (panelNow) {
                    applyBadges(panelNow, wishSet, askingRowMap);
                }
                applyPartnerAskingBadges(partnerPanelNow, askingRowMap);
                if (snapNow !== lastAugmentContentSnapshot) {
                    augmentRequesterInventoryUsd(panelNow, snapNow);
                }
            })
            .catch(function () {
                const rootNow = S.findTradeAppRoot();
                const snapNow = computeTradeRequestContentSnapshot(rootNow);
                const panelNow = S.findRequesterInventoryPanel(rootNow);
                const partnerPanelNow = S.findPartnerInventoryPanel(rootNow);
                if (panelNow) {
                    removeBadgesInPanel(panelNow);
                }
                applyPartnerAskingBadges(partnerPanelNow, new Map());
                if (snapNow !== lastAugmentContentSnapshot) {
                    augmentRequesterInventoryUsd(panelNow, snapNow);
                }
            });
    }
    function schedule() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            debounceTimer = null;
            runWishlistOverlay();
        }, DEBOUNCE_MS);
    }
    function disconnectDomObserver() {
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
    }
    function connectDomObserver() {
        const root = S.findTradeAppRoot();
        if (!root || domObserver) {
            return;
        }
        bindTradeRequestDirectHandlers(root);
        domObserver = new MutationObserver(function (records) {
            if (!S.isTradeRequestFlowPage() || suppressTradeRequestDomObserver) {
                return;
            }
            for (let i = 0; i < records.length; i++) {
                if (recordIsRelevantTradeRequestMutation(records[i], root)) {
                    schedule();
                    return;
                }
            }
        });
        domObserver.observe(root, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class'],
        });
    }
    function teardownTradeRequestWishlistUi() {
        disconnectDomObserver();
        lastAugmentContentSnapshot = null;
        document.querySelectorAll('.' + THUMB_BADGES_CLASS).forEach(function (el) {
            el.remove();
        });
        document
            .querySelectorAll('.item-card-thumb-container [' + THUMB_PROOF_ATTR + ']')
            .forEach(function (el) {
                el.remove();
            });
        document.querySelectorAll('.rotrade-asking-nft-badge').forEach(function (el) {
            el.remove();
        });
        document
            .querySelectorAll('.item-card-thumb-container > .' + BADGE_CLASS)
            .forEach(function (el) {
                el.remove();
            });
        document.querySelectorAll('.rotrade-partner-asking-badges').forEach(function (el) {
            el.classList.remove('rotrade-partner-asking-badges');
        });
        const rm =
            window.TradeDetailItemIds && window.TradeDetailItemIds.removeTradeRequestInventoryUsd;
        if (rm) {
            rm(S.findRequesterInventoryPanel(S.findTradeAppRoot()));
        }
    }
    function init() {
        if (window.__rotradeTradeRequestWishlistInit) {
            return;
        }
        window.__rotradeTradeRequestWishlistInit = true;
        ensureBadgeStyles();
        routeObserver = new MutationObserver(function () {
            if (S.isTradeRequestFlowPage()) {
                connectDomObserver();
                schedule();
            } else {
                teardownTradeRequestWishlistUi();
            }
        });
        routeObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
        window.addEventListener('popstate', function () {
            if (S.isTradeRequestFlowPage()) {
                connectDomObserver();
                schedule();
            } else {
                teardownTradeRequestWishlistUi();
            }
        });
        window.addEventListener('hashchange', function () {
            schedule();
        });
        if (S.isTradeRequestFlowPage()) {
            connectDomObserver();
            schedule();
        }
    }
    window.TradeRequestWishlist = {
        init: init,
    };
})();
