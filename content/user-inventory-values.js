(function () {
    'use strict';

    const WRAP_CLASS = 'rotrade-caption-values';
    const WRAP_ATTR = 'data-rotrade-caption-values';
    const ROW_CLASS = 'rotrade-row';
    const ROW_ROL_CLASS = 'rotrade-row-rolimons';
    const ROW_USD_CLASS = 'rotrade-row-usd';
    const VAL_LINK_CLASS = 'rotrade-caption-rolimons-value-link';
    const USD_LINK_CLASS = 'rotrade-caption-usd-value-link';

    let rolimonItemsCache = null;
    let rolimonItemsPromise = null;
    let settingsCache = null;
    let settingsPromise = null;

    function onInventoryPage() {
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        return /^\/users\/\d+\/inventory\/?$/.test(normalized);
    }

    function getRolimonItems() {
        if (rolimonItemsCache) return Promise.resolve(rolimonItemsCache);
        if (rolimonItemsPromise) return rolimonItemsPromise;
        rolimonItemsPromise = new Promise(function (resolve) {
            try {
                chrome.runtime.sendMessage(
                    { action: 'fetchRolimons' },
                    function (response) {
                        if (chrome.runtime.lastError || !response || !response.success) {
                            rolimonItemsPromise = null;
                            resolve({});
                            return;
                        }
                        rolimonItemsCache = (response.data && response.data.items) || {};
                        rolimonItemsPromise = null;
                        resolve(rolimonItemsCache);
                    }
                );
            } catch {
                rolimonItemsPromise = null;
                resolve({});
            }
        });
        return rolimonItemsPromise;
    }

    function getSettings() {
        if (settingsCache) return Promise.resolve(settingsCache);
        if (settingsPromise) return settingsPromise;
        settingsPromise = new Promise(function (resolve) {
            try {
                chrome.storage.local.get(['rotradeSettings'], function (r) {
                    if (chrome.runtime.lastError) {
                        settingsPromise = null;
                        resolve({});
                        return;
                    }
                    settingsCache = (r && r.rotradeSettings) || {};
                    settingsPromise = null;
                    resolve(settingsCache);
                });
            } catch {
                settingsPromise = null;
                resolve({});
            }
        });
        return settingsPromise;
    }

    function getAssetIdFromCard(card) {
        if (!card) return null;
        const directAttrs = [
            'data-target-id',
            'data-item-id',
            'data-asset-id',
            'data-itemid',
            'data-assetid',
        ];
        for (let i = 0; i < directAttrs.length; i++) {
            const v = card.getAttribute(directAttrs[i]);
            if (v && /^\d+$/.test(v)) {
                return v;
            }
        }
        const link =
            card.querySelector('a[href*="/catalog/"]') ||
            card.querySelector('a[href*="/bundles/"]') ||
            card.querySelector('a[ng-href*="/catalog/"]');
        if (link) {
            const href = link.getAttribute('href') || link.getAttribute('ng-href') || '';
            const m = href.match(/\/(?:catalog|bundles)\/(\d+)/);
            if (m) return m[1];
        }
        const inner = card.querySelector('[data-item-id], [data-target-id], [data-asset-id]');
        if (inner) {
            const v =
                inner.getAttribute('data-target-id') ||
                inner.getAttribute('data-item-id') ||
                inner.getAttribute('data-asset-id');
            if (v && /^\d+$/.test(v)) {
                return v;
            }
        }
        return null;
    }

    function lookupRolimon(items, assetId) {
        if (!items || !assetId) return null;
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x;
                  };
        const canonical = normalize(assetId) || assetId;
        return (
            items[canonical] ||
            items[String(canonical)] ||
            items[Number(canonical)] ||
            items[assetId] ||
            items[Number(assetId)] ||
            null
        );
    }

    function formatRolimonsValue(n) {
        const v = Math.round(Number(n));
        if (!isFinite(v) || v <= 0) return null;
        return v.toLocaleString('en-US');
    }

    function formatUsd(robux, per1k) {
        const v = ((Number(robux) || 0) * (Number(per1k) || 0)) / 1000;
        if (!isFinite(v) || v <= 0) return null;
        if (v >= 100) return '$' + Math.round(v).toLocaleString('en-US');
        return '$' + v.toFixed(2);
    }

    function findCaption(card) {
        return (
            card.querySelector('.item-card-price') ||
            card.querySelector('.item-card-caption') ||
            card.querySelector('.price-info') ||
            (card.classList && card.classList.contains('item-card-container') ? card : null) ||
            card.querySelector('.item-card-container') ||
            card
        );
    }

    function extensionIconUrl(path) {
        try {
            return chrome.runtime.getURL(path);
        } catch {
            return '';
        }
    }

    function applyRolimonsIconStyles(iconSpan) {
        const url = extensionIconUrl('assets/icons/logo.svg');
        if (url) {
            iconSpan.style.backgroundImage =
                'url("' + url.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
        }
        iconSpan.style.display = 'inline-block';
        iconSpan.style.backgroundSize = 'cover';
        iconSpan.style.width = '19px';
        iconSpan.style.height = '19px';
        iconSpan.style.marginTop = '0px';
        iconSpan.style.marginRight = '6px';
        iconSpan.style.marginLeft = '0px';
        iconSpan.style.transform = 'translateY(2px)';
        iconSpan.style.backgroundColor = 'transparent';
    }

    function applyUsdIconStyles(iconEl) {
        const usdIconUrl = extensionIconUrl('assets/icons/heavy-dollar-sign.svg');
        iconEl.style.display = 'inline-block';
        if (usdIconUrl) {
            iconEl.style.backgroundImage =
                'url("' + usdIconUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
            iconEl.textContent = '';
            iconEl.style.fontSize = '0';
            iconEl.style.color = 'transparent';
        } else {
            iconEl.textContent = '$';
            iconEl.style.fontSize = '13px';
            iconEl.style.color = 'rgb(32, 215, 66)';
            iconEl.style.backgroundImage = 'none';
        }
        iconEl.style.backgroundSize = 'cover';
        iconEl.style.width = '19px';
        iconEl.style.height = '19px';
        iconEl.style.marginTop = '0px';
        iconEl.style.marginRight = '6px';
        iconEl.style.marginLeft = '0px';
        iconEl.style.transform = 'translateY(2px)';
        iconEl.style.backgroundColor = 'transparent';
    }

    function getOrCreateWrap(caption) {
        let wrap = caption.querySelector(':scope > [' + WRAP_ATTR + ']');
        if (wrap) return wrap;
        wrap = document.createElement('div');
        wrap.className = WRAP_CLASS;
        wrap.setAttribute(WRAP_ATTR, '1');
        caption.appendChild(wrap);
        return wrap;
    }

    function ensureRolimonsRow(wrap, valueText, itemIdStr) {
        const rolimonsHref =
            'https://www.rolimons.com/item/' + encodeURIComponent(itemIdStr);
        let row = wrap.querySelector(':scope > .' + ROW_ROL_CLASS);
        if (!row) {
            row = document.createElement('div');
            row.className = ROW_CLASS + ' ' + ROW_ROL_CLASS;
            row.setAttribute('data-rotrade-synthetic', '1');
            row.setAttribute('data-rotrade-item-id', itemIdStr);
            const iconSpan = document.createElement('span');
            iconSpan.className = 'icon icon-rolimons';
            iconSpan.setAttribute('aria-hidden', 'true');
            applyRolimonsIconStyles(iconSpan);
            const valSpan = document.createElement('span');
            valSpan.className = 'valueSpan text-robux';
            valSpan.setAttribute('data-rotrade-synthetic', '1');
            valSpan.setAttribute('data-rotrade-item-id', itemIdStr);
            valSpan.textContent = valueText;
            const link = document.createElement('a');
            link.className = VAL_LINK_CLASS;
            link.href = rolimonsHref;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.setAttribute('title', 'View item on Rolimons');
            link.appendChild(valSpan);
            row.appendChild(iconSpan);
            row.appendChild(link);
            wrap.insertBefore(row, wrap.firstChild);
            return row;
        }
        row.setAttribute('data-rotrade-item-id', itemIdStr);
        const valSpan = row.querySelector('.valueSpan');
        if (valSpan) {
            valSpan.setAttribute('data-rotrade-item-id', itemIdStr);
            if (valSpan.textContent !== valueText) valSpan.textContent = valueText;
        }
        const link = row.querySelector('a.' + VAL_LINK_CLASS);
        if (link && link.getAttribute('href') !== rolimonsHref) {
            link.setAttribute('href', rolimonsHref);
        }
        return row;
    }

    function ensureUsdRow(wrap, usdText, itemIdStr) {
        const rolimonsHref =
            'https://www.rolimons.com/item/' + encodeURIComponent(itemIdStr);
        let row = wrap.querySelector(':scope > .' + ROW_USD_CLASS);
        if (!row) {
            row = document.createElement('div');
            row.className = ROW_CLASS + ' ' + ROW_USD_CLASS;
            row.setAttribute('data-rotrade-usd', '1');
            row.setAttribute('data-rotrade-item-id', itemIdStr);
            const iconEl = document.createElement('span');
            iconEl.className = 'icon rotrade-usd-currency';
            iconEl.setAttribute('aria-hidden', 'true');
            applyUsdIconStyles(iconEl);
            const amount = document.createElement('span');
            amount.className = 'valueSpan text-robux';
            amount.setAttribute('data-rotrade-usd', '1');
            amount.setAttribute('data-rotrade-item-id', itemIdStr);
            amount.textContent = usdText;
            const link = document.createElement('a');
            link.className = USD_LINK_CLASS;
            link.href = rolimonsHref;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.setAttribute('title', 'View item on Rolimons');
            link.appendChild(amount);
            row.appendChild(iconEl);
            row.appendChild(link);
            wrap.appendChild(row);
            return row;
        }
        row.setAttribute('data-rotrade-item-id', itemIdStr);
        const amount = row.querySelector('.valueSpan');
        if (amount) {
            amount.setAttribute('data-rotrade-item-id', itemIdStr);
            if (amount.textContent !== usdText) amount.textContent = usdText;
        }
        const link = row.querySelector('a.' + USD_LINK_CLASS);
        if (link && link.getAttribute('href') !== rolimonsHref) {
            link.setAttribute('href', rolimonsHref);
        }
        return row;
    }

    function removeWrap(card) {
        const caption = findCaption(card);
        if (!caption) return;
        const wrap = caption.querySelector(':scope > [' + WRAP_ATTR + ']');
        if (wrap) wrap.remove();
    }

    function removeUsdRow(wrap) {
        const row = wrap.querySelector(':scope > .' + ROW_USD_CLASS);
        if (row) row.remove();
    }

    function decorate(items, settings) {
        const metric = settings.profileMetric === 'rap' ? 'rap' : 'value';
        const metricIndex = metric === 'rap' ? 2 : 4;
        const usdEnabled = settings.usdValuesEnabled !== false;
        const per1k =
            typeof settings.usdPer1kRobux === 'number' ? settings.usdPer1kRobux : 4;
        const cardSelectors = [
            '.item-card-container',
            '.list-item.asset-item',
            '[data-testid="asset-card"]',
            '[data-testid="collectible-item"]',
        ];
        const seen = new Set();
        const cards = [];
        cardSelectors.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
                if (!seen.has(el)) {
                    seen.add(el);
                    cards.push(el);
                }
            });
        });
        cards.forEach(function (card) {
            const assetId = getAssetIdFromCard(card);
            if (!assetId) {
                removeWrap(card);
                return;
            }
            if (window.ProjectedFlag && window.ProjectedFlag.decorateThumbContainer) {
                const thumbContainer = card.querySelector('.item-card-thumb-container');
                if (thumbContainer) {
                    window.ProjectedFlag.decorateThumbContainer(thumbContainer, assetId, items);
                }
            }
            const rolimon = lookupRolimon(items, assetId);
            if (!rolimon || !Array.isArray(rolimon) || rolimon.length <= metricIndex) {
                removeWrap(card);
                return;
            }
            const amount = Number(rolimon[metricIndex]) || 0;
            const valueText = formatRolimonsValue(amount);
            if (!valueText) {
                removeWrap(card);
                return;
            }
            const caption = findCaption(card);
            if (!caption) return;
            const wrap = getOrCreateWrap(caption);
            const itemIdStr = String(assetId);
            ensureRolimonsRow(wrap, valueText, itemIdStr);
            const usdText = usdEnabled ? formatUsd(amount, per1k) : null;
            if (usdText) {
                ensureUsdRow(wrap, usdText, itemIdStr);
            } else {
                removeUsdRow(wrap);
            }
        });
    }

    function run() {
        if (!onInventoryPage()) {
            return;
        }
        Promise.all([getRolimonItems(), getSettings()]).then(function (results) {
            if (!onInventoryPage()) {
                return;
            }
            try {
                decorate(results[0], results[1] || {});
            } catch {}
        });
    }

    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
            scheduled = false;
            try {
                run();
            } catch {}
        });
    }

    function init() {
        if (window.__rotradeUserInventoryValuesInit) {
            return;
        }
        window.__rotradeUserInventoryValuesInit = true;
        schedule();
        if (window.Scheduler && typeof window.Scheduler.onBodyMutation === 'function') {
            try {
                window.Scheduler.onBodyMutation(schedule);
            } catch {}
        }
        window.addEventListener('hashchange', function () {
            settingsCache = null;
            schedule();
        });
        window.addEventListener('popstate', function () {
            settingsCache = null;
            schedule();
        });
        if (
            typeof chrome !== 'undefined' &&
            chrome.storage &&
            chrome.storage.onChanged &&
            typeof chrome.storage.onChanged.addListener === 'function'
        ) {
            try {
                chrome.storage.onChanged.addListener(function (changes, areaName) {
                    if (areaName !== 'local' || !changes.rotradeSettings) return;
                    settingsCache = null;
                    schedule();
                });
            } catch {}
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.UserInventoryValues = {
        init: init,
        schedule: schedule,
        run: run,
    };
})();
