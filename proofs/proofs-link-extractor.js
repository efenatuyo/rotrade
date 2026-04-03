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
    window.ProofsLinkExtractor = {
        extractItemId: extractItemId,
        extractItemName: extractItemName,
        extractItemIdFromThumbnail: extractItemIdFromThumbnail,
        extractItemIdFromCatalogLink: extractItemIdFromCatalogLink,
        extractItemIdFromRolimonsLink: extractItemIdFromRolimonsLink,
    };
})();
