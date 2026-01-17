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
        proofsLinkContainer.className = 'proofs-link-container';
        proofsLinkContainer.setAttribute('data-toggle', 'tooltip');
        proofsLinkContainer.setAttribute('title', CONFIG.tooltipText);
        proofsLinkContainer.setAttribute('data-original-title', CONFIG.tooltipText);
        proofsLinkContainer.style.cssText = 'display: inline-block; cursor: pointer; color: #888; text-decoration: none; margin-left: 6px; font-size: 10px; white-space: nowrap;';
        
        const proofsText = document.createElement('span');
        proofsText.textContent = CONFIG.linkText;
        proofsText.style.cssText = 'font-size: 10px; color: #888;';

        proofsLinkContainer.appendChild(proofsText);
        return proofsLinkContainer;
    }

    function addProofsLinkStyles() {
        if (document.getElementById('proofs-link-styles')) return;

        const style = document.createElement('style');
        style.id = 'proofs-link-styles';
        style.textContent = `
            .proofs-link-container {
                display: inline-block;
                cursor: pointer;
                color: #888;
                text-decoration: none;
                margin-left: 6px;
                font-size: 10px;
                white-space: nowrap;
            }

            .proofs-link-container:hover {
                color: #666;
                text-decoration: underline;
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
