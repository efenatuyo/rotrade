(function() {
    'use strict';

    function createSafeUrl(itemId) {
        if (!window.ProofsLinkConfig || !window.ProofsLinkValidation) return null;

        const { CONFIG } = window.ProofsLinkConfig;
        const { sanitizeItemId } = window.ProofsLinkValidation;

        const sanitizedId = sanitizeItemId(itemId);
        if (!sanitizedId) return null;
        
        return `${CONFIG.baseUrl}/${sanitizedId}`;
    }

    function createProofsLink(itemId) {
        if (!window.ProofsLinkConfig || !window.ProofsLinkValidation) return null;

        const { CONFIG } = window.ProofsLinkConfig;
        const { sanitizeItemId } = window.ProofsLinkValidation;

        const sanitizedId = sanitizeItemId(itemId);
        if (!sanitizedId) return null;

        const url = createSafeUrl(sanitizedId);
        if (!url) return null;

        const proofsLinkContainer = document.createElement('a');
        proofsLinkContainer.href = url;
        proofsLinkContainer.target = '_blank';
        proofsLinkContainer.rel = 'noopener noreferrer';
        proofsLinkContainer.className = 'proofs-link-container ng-isolate-scope';
        proofsLinkContainer.setAttribute('uib-tooltip', CONFIG.tooltipText);
        proofsLinkContainer.setAttribute('tooltip-placement', 'right');
        proofsLinkContainer.setAttribute('tooltip-append-to-body', 'true');
        proofsLinkContainer.setAttribute('data-toggle', 'tooltip');
        proofsLinkContainer.setAttribute('title', CONFIG.tooltipText);
        proofsLinkContainer.setAttribute('data-original-title', CONFIG.tooltipText);
        proofsLinkContainer.style.cssText = 'cursor: pointer; display: flex; align-items: center; justify-content: center; position: absolute; top: 8px; right: 8px; z-index: 10;';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon-proofs';
        iconSpan.textContent = 'P';

        proofsLinkContainer.appendChild(iconSpan);
        return proofsLinkContainer;
    }

    function addProofsLinkStyles() {
        if (document.getElementById('proofs-link-styles')) return;

        const style = document.createElement('style');
        style.id = 'proofs-link-styles';
        style.textContent = `
            .item-card-thumb-container {
                position: relative;
            }

            .proofs-link-container {
                position: absolute;
                top: 8px;
                right: 8px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                border-radius: 50%;
                width: 22px;
                height: 22px;
                background-color: #494d5a;
                transition: all 0.2s ease;
                overflow: hidden;
            }

            .icon-proofs {
                display: block;
                white-space: nowrap;
                width: 100%;
                height: 100%;
                font-size: 12px;
                font-weight: 500;
                line-height: 22px;
                text-align: center;
                padding-top: 2px;
            }

            .proofs-link-container:hover {
                background-color: #353741;
                width: auto;
                min-width: 22px;
                padding: 0 8px;
                border-radius: 11px;
                height: 22px;
            }

            .tooltip,
            .tooltip-inner {
                white-space: nowrap !important;
                max-width: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    window.ProofsLinkDOM = {
        createSafeUrl,
        createProofsLink,
        addProofsLinkStyles
    };
})();
