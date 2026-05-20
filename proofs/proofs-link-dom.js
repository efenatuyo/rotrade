(function () {
    'use strict';
    function createProofsLink(context) {
        if (!window.ProofsLinkConfig || !window.ProofsLinkValidation) return null;
        const { CONFIG: CONFIG } = window.ProofsLinkConfig;
        const ctx = context || {};
        const itemId = ctx.itemId || null;
        const itemName = ctx.itemName || null;
        const ciid = ctx.ciid || null;
        const uaid = ctx.uaid || null;
        if (!itemId && !itemName) return null;
        const proofsLinkContainer = document.createElement('a');
        proofsLinkContainer.href = 'javascript:void(0)';
        proofsLinkContainer.setAttribute('role', 'button');
        proofsLinkContainer.className = 'proofs-link-container ng-isolate-scope';
        proofsLinkContainer.setAttribute('uib-tooltip', CONFIG.tooltipText);
        proofsLinkContainer.setAttribute('tooltip-placement', 'right');
        proofsLinkContainer.setAttribute('tooltip-append-to-body', 'true');
        proofsLinkContainer.setAttribute('data-toggle', 'tooltip');
        proofsLinkContainer.setAttribute('title', CONFIG.tooltipText);
        proofsLinkContainer.setAttribute('data-original-title', CONFIG.tooltipText);
        proofsLinkContainer.style.cssText =
            'cursor: pointer; display: flex; align-items: center; justify-content: center; position: absolute; top: 8px; right: 8px; z-index: 10;';
        proofsLinkContainer.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.ProofsPopup && typeof window.ProofsPopup.show === 'function') {
                window.ProofsPopup.show({
                    itemId: itemId,
                    itemName: itemName,
                    ciid: ciid,
                    uaid: uaid,
                });
            }
        });
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
        style.textContent = `\n            .item-card-thumb-container {\n                position: relative;\n            }\n\n            .proofs-link-container {\n                position: absolute;\n                top: 8px;\n                right: 8px;\n                cursor: pointer;\n                display: inline-flex;\n                align-items: center;\n                justify-content: center;\n                z-index: 10;\n                border-radius: 50%;\n                width: 22px;\n                height: 22px;\n                background-color: #494d5a;\n                transition: all 0.2s ease;\n                overflow: hidden;\n            }\n\n            .icon-proofs {\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                white-space: nowrap;\n                width: 100%;\n                height: 100%;\n                font-size: 12px;\n                font-weight: 500;\n                line-height: 1;\n                text-align: center;\n                padding: 0;\n                margin: 0;\n            }\n\n            body:not(.dark-theme) .proofs-link-container {\n                background-color: rgb(188, 190, 200);\n                color: rgb(32, 34, 39);\n            }\n\n            body:not(.dark-theme) .proofs-link-container .icon-proofs {\n                color: rgb(32, 34, 39);\n            }\n\n            body:not(.dark-theme) .proofs-link-container:hover {\n                background-color: rgb(170, 172, 182);\n                color: rgb(32, 34, 39);\n            }\n\n            body:not(.dark-theme) .proofs-link-container:hover .icon-proofs {\n                color: rgb(32, 34, 39);\n            }\n\n            .proofs-link-container:hover {\n                background-color: #353741;\n                width: auto;\n                min-width: 22px;\n                padding: 0 8px;\n                border-radius: 11px;\n                height: 22px;\n            }\n\n            .tooltip,\n            .tooltip-inner {\n                white-space: nowrap !important;\n                max-width: none !important;\n            }\n        `;
        document.head.appendChild(style);
    }
    window.ProofsLinkDOM = {
        createProofsLink: createProofsLink,
        addProofsLinkStyles: addProofsLinkStyles,
    };
})();
