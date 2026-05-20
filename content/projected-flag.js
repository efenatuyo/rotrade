(function () {
    'use strict';

    const STYLE_ID = 'rotrade-projected-flag-styles';
    const FLAG_BOX_CLASS = 'rotrade-flag-box';
    const PROJECTED_FLAG_CLASS = 'projected-flag';
    const RARE_FLAG_CLASS = 'rare-flag';
    const ROLIMONS_LINK_CLASS = 'rotrade-rolimons-link';
    const ROLIMONS_PROJECTED_INDEX = 7;
    const ROLIMONS_RARE_INDEX = 9;
    const PROJECTED_TOOLTIP = 'This item is projected.';
    const RARE_TOOLTIP = 'This item is rare.';
    const ROLIMONS_TOOLTIP = "Open on Rolimon's";

    let rolimonsItemsPromise = null;
    let rolimonsItemsCache = null;

    function getRolimonsItems() {
        if (rolimonsItemsCache) return Promise.resolve(rolimonsItemsCache);
        if (rolimonsItemsPromise) return rolimonsItemsPromise;
        rolimonsItemsPromise = new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: 'fetchRolimons' }, (response) => {
                    rolimonsItemsPromise = null;
                    if (chrome.runtime.lastError || !response || !response.success) {
                        resolve({});
                        return;
                    }
                    rolimonsItemsCache = (response.data && response.data.items) || {};
                    resolve(rolimonsItemsCache);
                });
            } catch {
                rolimonsItemsPromise = null;
                resolve({});
            }
        });
        return rolimonsItemsPromise;
    }

    function isRobloxDarkTheme() {
        return (
            (document.body && document.body.classList.contains('dark-theme')) ||
            (document.documentElement &&
                document.documentElement.classList.contains('dark-theme'))
        );
    }

    function rolimonsLinkIconUrl() {
        return chrome.runtime.getURL(
            isRobloxDarkTheme() ? 'assets/rolimonsLink.svg' : 'assets/rolimonsLinkDark.svg'
        );
    }

    function isProjected(items, itemId) {
        if (!items || !itemId) return false;
        const entry = items[itemId];
        return Array.isArray(entry) && entry[ROLIMONS_PROJECTED_INDEX] === 1;
    }

    function isRare(items, itemId) {
        if (!items || !itemId) return false;
        const entry = items[itemId];
        return Array.isArray(entry) && entry[ROLIMONS_RARE_INDEX] === 1;
    }

    function onTradesListPage() {
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        if (normalized !== '/trades') return false;
        if (document.body && document.body.classList.contains('path-auto-trades-send')) {
            return false;
        }
        return true;
    }

    function onUserTradePage() {
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        return /^\/users\/\d+\/trade\/?$/.test(normalized);
    }

    function onTradePage() {
        return onTradesListPage() || onUserTradePage();
    }

    function onCiiidEnabledPage() {
        if (onTradePage()) return true;
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        return /^\/users\/\d+\/inventory\/?$/.test(normalized);
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .item-card-thumb-container {
                position: relative;
            }
            .${FLAG_BOX_CLASS} {
                position: absolute;
                top: 6px;
                left: 84px;
                background-color: transparent;
                z-index: 10;
                line-height: 0;
                pointer-events: auto;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .${FLAG_BOX_CLASS} .${PROJECTED_FLAG_CLASS},
            .${FLAG_BOX_CLASS} .${RARE_FLAG_CLASS} {
                display: block;
                cursor: default;
            }
            .${FLAG_BOX_CLASS} .${PROJECTED_FLAG_CLASS} img,
            .${FLAG_BOX_CLASS} .${RARE_FLAG_CLASS} img {
                height: 27px;
                width: 27px;
                padding: 3px;
                display: block;
            }
            .${ROLIMONS_LINK_CLASS} {
                position: absolute;
                bottom: 6px;
                right: 6px;
                width: 26px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: transparent;
                cursor: pointer;
                text-decoration: none;
                z-index: 10;
                transition: transform 0.15s ease;
            }
            .${ROLIMONS_LINK_CLASS}:hover {
                transform: scale(1.1);
            }
            .${ROLIMONS_LINK_CLASS} img {
                width: 16px;
                height: 16px;
                display: block;
                pointer-events: none;
            }
            .trade-item-card .limited-icon-container,
            .trade-item-card .icon-shop-limited {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    function ensureFlagBox(thumbContainer) {
        let box = thumbContainer.querySelector(':scope > .' + FLAG_BOX_CLASS);
        if (box) return box;
        box = document.createElement('div');
        box.className = FLAG_BOX_CLASS;
        thumbContainer.appendChild(box);
        return box;
    }

    function addProjectedFlag(box) {
        if (box.querySelector('.' + PROJECTED_FLAG_CLASS)) return;
        const flag = document.createElement('div');
        flag.className = PROJECTED_FLAG_CLASS;
        flag.title = PROJECTED_TOOLTIP;
        flag.setAttribute('data-original-title', PROJECTED_TOOLTIP);
        flag.setAttribute('data-toggle', 'tooltip');
        flag.setAttribute('uib-tooltip', PROJECTED_TOOLTIP);
        flag.setAttribute('tooltip-placement', 'bottom');
        flag.setAttribute('tooltip-append-to-body', 'true');
        flag.setAttribute('aria-label', PROJECTED_TOOLTIP);
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL('assets/projected.png');
        img.alt = 'Projected';
        flag.appendChild(img);
        box.appendChild(flag);
    }

    function addRareFlag(box) {
        if (box.querySelector('.' + RARE_FLAG_CLASS)) return;
        const flag = document.createElement('div');
        flag.className = RARE_FLAG_CLASS;
        flag.title = RARE_TOOLTIP;
        flag.setAttribute('data-original-title', RARE_TOOLTIP);
        flag.setAttribute('data-toggle', 'tooltip');
        flag.setAttribute('uib-tooltip', RARE_TOOLTIP);
        flag.setAttribute('tooltip-placement', 'bottom');
        flag.setAttribute('tooltip-append-to-body', 'true');
        flag.setAttribute('aria-label', RARE_TOOLTIP);
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL('assets/rare.png');
        img.alt = 'Rare';
        flag.appendChild(img);
        box.appendChild(flag);
    }

    function removeRareFlag(thumbContainer) {
        const box = thumbContainer.querySelector(':scope > .' + FLAG_BOX_CLASS);
        if (!box) return;
        const flag = box.querySelector('.' + RARE_FLAG_CLASS);
        if (flag) flag.remove();
        if (!box.children.length) box.remove();
    }

    function addRolimonsLink(thumbContainer, itemId) {
        if (!itemId) return;
        if (thumbContainer.closest && thumbContainer.closest('#item-details')) return;
        if (thumbContainer.querySelector(':scope > .' + ROLIMONS_LINK_CLASS)) return;
        const link = document.createElement('a');
        link.className = ROLIMONS_LINK_CLASS;
        link.href = `https://www.rolimons.com/item/${encodeURIComponent(itemId)}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = ROLIMONS_TOOLTIP;
        link.setAttribute('data-original-title', ROLIMONS_TOOLTIP);
        link.setAttribute('data-toggle', 'tooltip');
        link.setAttribute('uib-tooltip', ROLIMONS_TOOLTIP);
        link.setAttribute('tooltip-placement', 'left');
        link.setAttribute('tooltip-append-to-body', 'true');
        link.setAttribute('aria-label', ROLIMONS_TOOLTIP);
        link.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        const img = document.createElement('img');
        img.src = rolimonsLinkIconUrl();
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        link.appendChild(img);
        thumbContainer.appendChild(link);
    }

    function removeRolimonsLink(thumbContainer) {
        const link = thumbContainer.querySelector(':scope > .' + ROLIMONS_LINK_CLASS);
        if (link) link.remove();
    }

    function removeProjectedFlag(thumbContainer) {
        const box = thumbContainer.querySelector(':scope > .' + FLAG_BOX_CLASS);
        if (!box) return;
        const flag = box.querySelector('.' + PROJECTED_FLAG_CLASS);
        if (flag) flag.remove();
        if (!box.children.length) box.remove();
    }

    function decorateThumbContainer(thumbContainer, itemId, items) {
        if (!thumbContainer) return;
        try {
            injectStyles();
        } catch {}
        if (!itemId) {
            removeProjectedFlag(thumbContainer);
            removeRareFlag(thumbContainer);
            removeRolimonsLink(thumbContainer);
            return;
        }
        const computedPosition =
            thumbContainer.ownerDocument && thumbContainer.ownerDocument.defaultView
                ? thumbContainer.ownerDocument.defaultView
                      .getComputedStyle(thumbContainer)
                      .getPropertyValue('position')
                : '';
        if (computedPosition === 'static' || !computedPosition) {
            thumbContainer.style.position = 'relative';
        }
        addRolimonsLink(thumbContainer, itemId);
        const projected = isProjected(items, itemId);
        const rare = isRare(items, itemId);
        if (projected) {
            const box = ensureFlagBox(thumbContainer);
            addProjectedFlag(box);
        } else {
            removeProjectedFlag(thumbContainer);
        }
        if (rare) {
            const box = ensureFlagBox(thumbContainer);
            addRareFlag(box);
        } else {
            removeRareFlag(thumbContainer);
        }
    }

    function decorate(items) {
        if (!onTradePage()) return;
        if (!window.ProofsLinkExtractor) return;
        const cards = document.querySelectorAll('.trade-item-card');
        cards.forEach((card) => {
            const thumbContainer = card.querySelector('.item-card-thumb-container');
            if (!thumbContainer) return;
            const itemId = window.ProofsLinkExtractor.extractItemId(card);
            decorateThumbContainer(thumbContainer, itemId, items);
        });
    }

    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            getRolimonsItems().then((items) => {
                try {
                    decorate(items);
                } catch {}
            });
        });
    }

    function handleLimitedIconClick(e) {
        if (!onCiiidEnabledPage()) return;
        const target =
            e.target && e.target.closest
                ? e.target.closest('.icon-shop-limited, .limited-icon-container')
                : null;
        if (!target) return;
        const card = target.closest('.item-card-container');
        if (!card) return;
        const ciiid = card.getAttribute('data-collectibleiteminstanceid');
        if (!ciiid) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
        }
        window.open(
            `https://www.rolimons.com/ciiid/${encodeURIComponent(ciiid)}`,
            '_blank',
            'noopener,noreferrer'
        );
    }

    function init() {
        try {
            injectStyles();
        } catch {}
        schedule();
        if (window.Scheduler && typeof window.Scheduler.onBodyMutation === 'function') {
            try {
                window.Scheduler.onBodyMutation(schedule);
            } catch {}
        }
        document.addEventListener('click', handleLimitedIconClick, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ProjectedFlag = {
        init: init,
        schedule: schedule,
        decorate: decorate,
        decorateThumbContainer: decorateThumbContainer,
    };
})();
