(function() {
    'use strict';

    function extractItemIdFromThumbnail(itemCard) {
        if (!window.ProofsLinkConfig || !window.ProofsLinkValidation) return null;

        const { SELECTORS } = window.ProofsLinkConfig;
        const { sanitizeItemId } = window.ProofsLinkValidation;

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

        const { SELECTORS, REGEX } = window.ProofsLinkConfig;
        const { sanitizeItemId } = window.ProofsLinkValidation;

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

        const { SELECTORS, REGEX } = window.ProofsLinkConfig;
        const { sanitizeItemId } = window.ProofsLinkValidation;

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

        const { SELECTORS } = window.ProofsLinkConfig;
        const itemCardPrice = itemCard.querySelector(SELECTORS.itemCardPrice);
        
        return extractItemIdFromThumbnail(itemCard) ||
               extractItemIdFromCatalogLink(itemCard) ||
               extractItemIdFromRolimonsLink(itemCardPrice);
    }

    window.ProofsLinkExtractor = {
        extractItemId,
        extractItemIdFromThumbnail,
        extractItemIdFromCatalogLink,
        extractItemIdFromRolimonsLink
    };
})();
