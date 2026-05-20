(function () {
    'use strict';

    const EMPTY_IMG_RE = /empty_trade_slot|transparent-square/i;
    const ROLIMONS_TRADE_TAG_MAX_ID = 10;

    let itemDetailsThumbMap = null;
    let itemDetailsThumbMapSource = null;
    let itemDetailsThumbMapBuiltKeyCount = -1;

    function normalizeRbxCdnThumbKey(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }
        let s = url.split('?')[0].trim();
        s = s.replace(/^http:\/\//i, 'https://');
        return s.toLowerCase();
    }

    function collectRbxThumbBasesFromRow(row) {
        const bases = [];
        if (!Array.isArray(row) || row.length < 1) {
            return bases;
        }
        const seen = Object.create(null);
        for (let i = 0; i < row.length; i++) {
            const cell = row[i];
            if (typeof cell !== 'string' || cell.length < 12) {
                continue;
            }
            if (cell.indexOf('rbxcdn.com') === -1 && cell.indexOf('roblox.com') === -1) {
                continue;
            }
            const b = cell.split('?')[0].trim();
            if (b && !seen[b]) {
                seen[b] = true;
                bases.push(b);
            }
        }
        if (!bases.length) {
            const last = row[row.length - 1];
            if (typeof last === 'string' && last.length >= 12) {
                const b = last.split('?')[0].trim();
                if (b.indexOf('rbxcdn.com') !== -1 || b.indexOf('roblox.com') !== -1) {
                    bases.push(b);
                }
            }
        }
        return bases;
    }

    function indexThumbBaseIntoMap(map, base, id) {
        if (!base) {
            return;
        }
        const norm = normalizeRbxCdnThumbKey(base);
        if (norm) {
            map[norm] = id;
        }
        map[base] = id;
        const sig = norm.match(/180DAY-[a-f0-9]+/) || base.match(/180DAY-[a-f0-9]+/i);
        if (sig) {
            map[sig[0].toLowerCase()] = id;
        }
    }

    function buildItemDetailsThumbMap() {
        const details = window.item_details;
        if (!details || typeof details !== 'object') {
            return null;
        }
        const keyCount = Object.keys(details).length;
        const cacheOk =
            itemDetailsThumbMap &&
            itemDetailsThumbMapSource === details &&
            itemDetailsThumbMapBuiltKeyCount === keyCount &&
            (keyCount === 0 || Object.keys(itemDetailsThumbMap).length > 0);
        if (cacheOk) {
            return itemDetailsThumbMap;
        }
        const map = Object.create(null);
        for (const id in details) {
            if (!Object.prototype.hasOwnProperty.call(details, id)) {
                continue;
            }
            const row = details[id];
            const bases = collectRbxThumbBasesFromRow(row);
            for (let i = 0; i < bases.length; i++) {
                const base = bases[i];
                if (base.indexOf('rbxcdn.com') !== -1 || base.indexOf('roblox.com') !== -1) {
                    indexThumbBaseIntoMap(map, base, id);
                }
            }
        }
        itemDetailsThumbMap = map;
        itemDetailsThumbMapSource = details;
        itemDetailsThumbMapBuiltKeyCount = keyCount;
        return map;
    }

    function rawCatalogIdFromItemDetailsThumb(src) {
        if (!src || EMPTY_IMG_RE.test(src)) {
            return null;
        }
        const map = buildItemDetailsThumbMap();
        if (!map) {
            return null;
        }
        const base = src.split('?')[0].trim();
        const norm = normalizeRbxCdnThumbKey(src);
        if (norm && map[norm]) {
            return map[norm];
        }
        if (map[base]) {
            return map[base];
        }
        const sig = norm.match(/180DAY-[a-f0-9]+/) || base.match(/180DAY-[a-f0-9]+/i);
        if (sig && map[sig[0].toLowerCase()]) {
            return map[sig[0].toLowerCase()];
        }
        return null;
    }

    function itemIdForTradeLink(raw) {
        const Aliases = window.TradeItemIdAliases;
        const trimmed = raw == null || raw === '' ? null : String(raw).trim();
        if (!trimmed) {
            return null;
        }
        if (!Aliases || typeof Aliases.itemIdForAutoInstanceApi !== 'function') {
            return trimmed;
        }
        const n = Aliases.itemIdForAutoInstanceApi(raw);
        if (n != null && n !== '') {
            return String(n).trim();
        }
        const num = Number(trimmed);
        if (isFinite(num) && num > ROLIMONS_TRADE_TAG_MAX_ID) {
            return trimmed;
        }
        return null;
    }

    function rawCatalogIdFromTradeObjectSlot(slotIndex) {
        const to = window.trade_object;
        if (!to || !Array.isArray(to.item_slots)) {
            return null;
        }
        const v = to.item_slots[slotIndex];
        if (v == null || v === '') {
            return null;
        }
        const n = Number(v);
        if (!isFinite(n) || n <= ROLIMONS_TRADE_TAG_MAX_ID) {
            return null;
        }
        return String(n);
    }

    function datasetAssetIdFromElement(el) {
        if (!el || !el.attributes) {
            return null;
        }
        const prefer = [
            'data-item-id',
            'data-asset-id',
            'data-assetid',
            'data-catalog-item-id',
            'data-itemid',
        ];
        for (let i = 0; i < prefer.length; i++) {
            const v = el.getAttribute(prefer[i]);
            if (v && /^\d{4,}$/.test(String(v).trim())) {
                return String(v).trim();
            }
        }
        return null;
    }

    function extractRawAssetIdFromSlot(slotIndex) {
        const fromTradeObject = rawCatalogIdFromTradeObjectSlot(slotIndex);
        if (fromTradeObject) {
            return fromTradeObject;
        }
        const wrap = document.querySelector('.trade-item[data-item-slot="' + slotIndex + '"]');
        if (!wrap) {
            return null;
        }
        const mainImg = document.getElementById('item_img_' + slotIndex);
        if (!mainImg) {
            return null;
        }
        const src = mainImg.getAttribute('src') || '';
        if (!EMPTY_IMG_RE.test(src)) {
            const fromThumb = rawCatalogIdFromItemDetailsThumb(src);
            if (fromThumb) {
                const n = Number(fromThumb);
                if (isFinite(n) && n > ROLIMONS_TRADE_TAG_MAX_ID) {
                    return String(fromThumb);
                }
            }
        }
        const ds = datasetAssetIdFromElement(wrap) || datasetAssetIdFromElement(mainImg);
        if (ds) {
            return ds;
        }
        if (EMPTY_IMG_RE.test(src)) {
            return null;
        }
        function tryOnclick(el) {
            if (!el) {
                return null;
            }
            const oc = el.getAttribute('onclick') || '';
            const m = oc.match(
                /(?:mixer_item_click_handler|item_select_handler|item_img_click_handler|trade_item_click_handler)\s*\(\s*(\d{4,})/
            );
            return m ? m[1] : null;
        }
        let raw = tryOnclick(mainImg) || tryOnclick(wrap);
        if (!raw) {
            raw = tryOnclick(document.getElementById('item_remove_' + slotIndex));
        }
        if (!raw) {
            raw = tryOnclick(document.getElementById('item_select_' + slotIndex));
        }
        if (!raw) {
            const thumbMatch =
                src.match(/[?&]assetIds?=(\d{4,})/i) || src.match(/\/assets\/(\d{4,})\//i);
            if (thumbMatch) {
                raw = thumbMatch[1];
            }
        }
        return raw || null;
    }

    function collectNormalizedIdsForSlots(fromSlot, toSlotInclusive) {
        const ids = [];
        for (let s = fromSlot; s <= toSlotInclusive; s++) {
            const raw = extractRawAssetIdFromSlot(s);
            if (!raw) {
                continue;
            }
            const key = itemIdForTradeLink(raw);
            if (key) {
                ids.push(key);
            }
        }
        return ids;
    }

    window.RolimonsItemLookup = {
        rawCatalogIdFromItemDetailsThumb: rawCatalogIdFromItemDetailsThumb,
        itemIdForTradeLink: itemIdForTradeLink,
        rawCatalogIdFromTradeObjectSlot: rawCatalogIdFromTradeObjectSlot,
        extractRawAssetIdFromSlot: extractRawAssetIdFromSlot,
        collectNormalizedIdsForSlots: collectNormalizedIdsForSlots,
        buildItemDetailsThumbMap: buildItemDetailsThumbMap,
        ROLIMONS_TRADE_TAG_MAX_ID: ROLIMONS_TRADE_TAG_MAX_ID,
    };
})();
