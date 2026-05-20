(function () {
    'use strict';
    function extractItemIdFromThumbnail(itemCard) {
        if (!window.ProofsLinkConfig || !window.ProofsLinkValidation) return null;
        const { SELECTORS: SELECTORS } = window.ProofsLinkConfig;
        const { sanitizeItemId: sanitizeItemId } = window.ProofsLinkValidation;
        const thumbnailContainer = itemCard.querySelector(SELECTORS.thumbnailContainer);
        if (thumbnailContainer) {
            const id = thumbnailContainer.getAttribute('thumbnail-target-id');
            if (id) {
                const sanitized = sanitizeItemId(id);
                if (sanitized) return sanitized;
            }
        }
        const thumbnailElement = itemCard.querySelector(SELECTORS.thumbnailElement);
        if (thumbnailElement) {
            const id = thumbnailElement.getAttribute('thumbnail-target-id');
            if (id) {
                const sanitized = sanitizeItemId(id);
                if (sanitized) return sanitized;
            }
        }
        return null;
    }
    function extractItemIdFromCatalogLink(itemCard) {
        if (!window.ProofsLinkConfig || !window.ProofsLinkValidation) return null;
        const { SELECTORS: SELECTORS, REGEX: REGEX } = window.ProofsLinkConfig;
        const { sanitizeItemId: sanitizeItemId } = window.ProofsLinkValidation;
        const catalogLink = itemCard.querySelector(SELECTORS.catalogLink);
        if (!catalogLink) return null;
        const href = catalogLink.getAttribute('href') || catalogLink.getAttribute('ng-href') || '';
        const match = href.match(REGEX.catalogId);
        if (match && match[1]) {
            return sanitizeItemId(match[1]);
        }
        return null;
    }
    function extractItemIdFromRolimonsLink(itemCardPrice) {
        if (!itemCardPrice || !window.ProofsLinkConfig || !window.ProofsLinkValidation) return null;
        const { SELECTORS: SELECTORS, REGEX: REGEX } = window.ProofsLinkConfig;
        const { sanitizeItemId: sanitizeItemId } = window.ProofsLinkValidation;
        const rolimonsLink = itemCardPrice.querySelector(SELECTORS.rolimonsLink);
        if (!rolimonsLink) return null;
        const href = rolimonsLink.getAttribute('href') || '';
        const match = href.match(REGEX.rolimonsId);
        if (match && match[1]) {
            return sanitizeItemId(match[1]);
        }
        return null;
    }
    function extractItemId(itemCard) {
        if (!itemCard || !window.ProofsLinkConfig) return null;
        const { SELECTORS: SELECTORS } = window.ProofsLinkConfig;
        const itemCardPrice = itemCard.querySelector(SELECTORS.itemCardPrice);
        return (
            extractItemIdFromThumbnail(itemCard) ||
            extractItemIdFromCatalogLink(itemCard) ||
            extractItemIdFromRolimonsLink(itemCardPrice)
        );
    }
    function extractItemName(itemCard) {
        if (!itemCard || !window.ProofsLinkConfig) return null;
        const { SELECTORS: SELECTORS } = window.ProofsLinkConfig;
        if (SELECTORS.itemName) {
            const el = itemCard.querySelector(SELECTORS.itemName);
            if (el) {
                const text = (el.textContent || el.getAttribute('title') || '').trim();
                if (text) return text;
            }
        }
        const catalog = itemCard.querySelector('a[href*="/catalog/"]');
        if (catalog) {
            const text = (catalog.textContent || catalog.getAttribute('title') || '').trim();
            if (text) return text;
        }
        return null;
    }
    function readDataAttr(itemCard, name) {
        if (!itemCard) return null;
        const v = itemCard.getAttribute(name);
        if (v == null) return null;
        const trimmed = String(v).trim();
        return trimmed.length ? trimmed : null;
    }
    function normalizeItemId(rawId) {
        if (rawId == null) return null;
        const aliases = window.TradeItemIdAliases;
        if (aliases && typeof aliases.normalizeTradeItemId === 'function') {
            const mapped = aliases.normalizeTradeItemId(rawId);
            if (mapped != null && mapped !== '') {
                return String(mapped);
            }
        }
        return String(rawId);
    }
    function extractCiidFromDom(itemCard) {
        if (!itemCard) return null;
        const container = itemCard.querySelector('.item-card-container[data-collectibleiteminstanceid]');
        if (container) {
            const v = container.getAttribute('data-collectibleiteminstanceid');
            if (v && v.trim()) return v.trim();
        }
        const direct = itemCard.getAttribute && itemCard.getAttribute('data-collectibleiteminstanceid');
        if (direct && direct.trim()) return direct.trim();
        return null;
    }
    function extractItemContext(itemCard) {
        if (!itemCard) return { itemId: null, ciid: null, uaid: null, itemName: null };
        const taggedAssetId = readDataAttr(itemCard, 'data-rotrade-asset-id');
        const domItemId = extractItemId(itemCard);
        const rawId = taggedAssetId || domItemId;
        const ciid =
            extractCiidFromDom(itemCard) || readDataAttr(itemCard, 'data-rotrade-ciid');
        return {
            itemId: rawId ? normalizeItemId(rawId) : null,
            rawItemId: rawId || null,
            ciid: ciid,
            uaid: readDataAttr(itemCard, 'data-rotrade-uaid'),
            itemName: extractItemName(itemCard),
        };
    }
    window.ProofsLinkExtractor = {
        extractItemId: extractItemId,
        extractItemName: extractItemName,
        extractItemContext: extractItemContext,
        normalizeItemId: normalizeItemId,
        extractItemIdFromThumbnail: extractItemIdFromThumbnail,
        extractItemIdFromCatalogLink: extractItemIdFromCatalogLink,
        extractItemIdFromRolimonsLink: extractItemIdFromRolimonsLink,
    };
})();
