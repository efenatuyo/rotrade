(function () {
    'use strict';
    const {
        formatUsdAmountDisplay,
        formatRolimonsValueDisplay,
        rolimonsValueFromItemArray,
        rolimonsRapFromItemArray,
    } = window.TradeDetailFormatters || {};
    const {
        extractItemIdFromCard,
        collectItemIdCandidates,
        resolveItemIdPair,
        extractItemNameFromCard,
        classifyOfferHeader,
        findPartnerUserLink,
        extractPartnerUsername,
    } = window.TradeDetailParsers || {};
    const DEBOUNCE_MS = 80;
    let debounceTimer = null;
    let lastSerialized = '';
    let rolimonItemsRawCache = null;
    let rolimonItemsRawPromise = null;
    const roautotradeUserStatsInflight = new Map();
    const roautotradeUserStatsResolved = new Map();
    const roautotradeUserPrefsInflight = new Map();
    const roautotradeUserPrefsResolved = new Map();
    let observer = null;
    let detailObserver = null;
    let observedDetailEl = null;
    let tradesContainerObserver = null;
    let observedTradesContainerEl = null;
    let usdInjectSeq = 0;
    let catalogAugmentSeq = 0;
    let catalogDebounceTimer = null;
    let suppressObserverSchedule = false;
    function parseRobuxFromResellerPriceContainer(priceContainer) {
        if (!priceContainer) {
            return null;
        }
        const span = priceContainer.querySelector('.text-robux');
        if (!span) {
            return null;
        }
        const raw = (span.textContent || '').replace(/,/g, '').trim();
        const n = parseInt(raw, 10);
        return isFinite(n) && n >= 0 ? n : null;
    }
    function injectCatalogResellerResaleUsdRows(usdPer1k) {
        if (!window.TradeDetailPath.isMarketplaceItemDetailPage()) {
            return;
        }
        const per1k =
            typeof usdPer1k === 'number' && isFinite(usdPer1k) && usdPer1k > 0 ? usdPer1k : 4;
        const seen = new Set();
        const containers = window.RobloxSelectors
            ? window.RobloxSelectors.findAll('resellerPriceContainer')
            : Array.from(
                  document.querySelectorAll(
                      '#asset-resale-data-container .reseller-price-container,' +
                          'asset-resale-pane .reseller-price-container,' +
                          '#resellers .reseller-price-container,' +
                          '.resellers .reseller-price-container'
                  )
              );
        containers.forEach(function (priceContainer) {
            if (seen.has(priceContainer)) {
                return;
            }
            seen.add(priceContainer);
            const robux = parseRobuxFromResellerPriceContainer(priceContainer);
            if (robux === null) {
                return;
            }
            const usd = window.TradeDetailRobuxUsd.robuxAmountToUsd(robux, per1k);
            const display = '$' + formatUsdAmountDisplay(usd);
            const robuxSpan = priceContainer.querySelector('.text-robux');
            if (!robuxSpan || !robuxSpan.parentNode) {
                return;
            }
            let stack = priceContainer.querySelector('.rotrade-reseller-price-stack');
            if (!stack) {
                stack = document.createElement('span');
                stack.className = 'rotrade-reseller-price-stack';
                robuxSpan.parentNode.insertBefore(stack, robuxSpan);
                stack.appendChild(robuxSpan);
            }
            let line = stack.querySelector('[data-rotrade-reseller-usd]');
            if (line) {
                if (line.textContent !== display) {
                    line.textContent = display;
                }
                return;
            }
            line = document.createElement('div');
            line.className = 'rotrade-reseller-usd-at-rate';
            line.setAttribute('data-rotrade-reseller-usd', '1');
            line.textContent = display;
            stack.appendChild(line);
        });
    }
    function isSendTradeMode() {
        if (window.location.hash === '#/auto-trades-send') {
            return true;
        }
        if (document.body && document.body.classList.contains('path-auto-trades-send')) {
            return true;
        }
        return false;
    }
    function shouldRun() {
        return window.TradeDetailPath.isTradesPage() && !isSendTradeMode();
    }
    function withSuppressedObserverSchedule(fn) {
        suppressObserverSchedule = true;
        try {
            return fn();
        } finally {
            setTimeout(function () {
                suppressObserverSchedule = false;
            }, 0);
        }
    }
    function clearRolautotradePageCaches() {
        roautotradeUserStatsInflight.clear();
        roautotradeUserStatsResolved.clear();
        rolimonItemsRawCache = null;
        rolimonItemsRawPromise = null;
    }
    if (typeof window !== 'undefined' && !window.__rotradeTradeDetailPagehideBound) {
        window.__rotradeTradeDetailPagehideBound = true;
        window.addEventListener('pagehide', clearRolautotradePageCaches);
    }
    function getRolimonItemsRaw() {
        if (rolimonItemsRawCache) {
            return Promise.resolve(rolimonItemsRawCache);
        }
        if (rolimonItemsRawPromise) {
            return rolimonItemsRawPromise;
        }
        rolimonItemsRawPromise = new Promise(function (resolve) {
            try {
                chrome.runtime.sendMessage(
                    {
                        action: 'fetchRolimons',
                    },
                    function (response) {
                        if (chrome.runtime.lastError || !response || !response.success) {
                            rolimonItemsRawPromise = null;
                            resolve({});
                            return;
                        }
                        const items =
                            response.data && response.data.items ? response.data.items : {};
                        hydrateRolimonItemsAliasKeys(items);
                        rolimonItemsRawCache = items;
                        try {
                            if (typeof window.rolimonData !== 'object' || !window.rolimonData) {
                                window.rolimonData = {};
                            }
                            Object.assign(window.rolimonData, rolimonItemsRawCache);
                            hydrateRolimonItemsAliasKeys(window.rolimonData);
                        } catch {}
                        rolimonItemsRawPromise = null;
                        resolve(items);
                    }
                );
            } catch {
                rolimonItemsRawPromise = null;
                resolve({});
            }
        });
        return rolimonItemsRawPromise;
    }
    function hydrateRolimonItemsAliasKeys(items) {
        if (!items || typeof items !== 'object') {
            return;
        }
        const aliases =
            window.TradeItemIdAliases && window.TradeItemIdAliases.TRADE_ITEM_ID_ALIASES;
        if (!aliases) {
            return;
        }
        const fromKeys = Object.keys(aliases);
        for (let i = 0; i < fromKeys.length; i++) {
            const fromId = fromKeys[i];
            if (items[fromId]) {
                continue;
            }
            const toId = aliases[fromId];
            const target = items[toId] || items[String(toId)] || items[Number(toId)];
            if (target && Array.isArray(target)) {
                items[fromId] = target;
            }
        }
    }
    function usdFromRolimonsValueArray(arr, usdPer1k) {
        const val = rolimonsValueFromItemArray(arr);
        if (val === null) {
            return null;
        }
        return window.TradeDetailRobuxUsd.robuxAmountToUsd(val, usdPer1k);
    }
    function hasNativeRolimonsValueRow(priceEl) {
        if (priceEl.querySelector('.icon-rolimons:not([data-rotrade-synthetic])')) {
            return true;
        }
        const valueSpans = priceEl.querySelectorAll('.valueSpan');
        for (let i = 0; i < valueSpans.length; i++) {
            const v = valueSpans[i];
            if (v.hasAttribute('data-rotrade-usd')) {
                continue;
            }
            if (v.hasAttribute('data-rotrade-synthetic')) {
                continue;
            }
            return true;
        }
        return false;
    }
    function extensionIconUrl(relativePath) {
        try {
            if (
                typeof chrome !== 'undefined' &&
                chrome.runtime &&
                typeof chrome.runtime.getURL === 'function'
            ) {
                return chrome.runtime.getURL(relativePath);
            }
        } catch {}
        return '';
    }
    function applyRolimonsValkIconStyles(iconSpan) {
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
    function captionScopeFromPriceEl(priceEl) {
        if (!priceEl || !priceEl.closest) {
            return null;
        }
        return priceEl.closest('.item-card-caption') || priceEl.closest('.price-info');
    }
    function getOrCreateCaptionValuesContainer(priceEl) {
        const caption = captionScopeFromPriceEl(priceEl);
        if (!caption) {
            return null;
        }
        let wrap = caption.querySelector('[data-rotrade-caption-values]');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'rotrade-caption-values';
            wrap.setAttribute('data-rotrade-caption-values', '1');
            priceEl.insertAdjacentElement('afterend', wrap);
        }
        return wrap;
    }
    function findSyntheticRolimonsRowForItem(caption, itemIdStr) {
        if (!caption) {
            return null;
        }
        return caption.querySelector(
            '.rotrade-row-rolimons[data-rotrade-synthetic][data-rotrade-item-id="' +
                itemIdStr +
                '"]'
        );
    }
    function findSyntheticValueSpanForItem(priceEl, itemIdStr) {
        const caption = captionScopeFromPriceEl(priceEl);
        const row = findSyntheticRolimonsRowForItem(caption, itemIdStr);
        return row ? row.querySelector('span.valueSpan') : null;
    }
    function findUsdRowForItem(caption, itemIdStr) {
        if (!caption) {
            return null;
        }
        return caption.querySelector(
            '.rotrade-row-usd[data-rotrade-usd][data-rotrade-item-id="' + itemIdStr + '"]'
        );
    }
    function pruneEmptyCaptionValuesContainer(caption) {
        if (!caption) {
            return;
        }
        const wrap = caption.querySelector('[data-rotrade-caption-values]');
        if (wrap && !wrap.querySelector('[data-rotrade-synthetic], [data-rotrade-usd]')) {
            wrap.remove();
        }
    }
    function removeSyntheticAugmentationFromCaption(caption) {
        if (!caption) {
            return;
        }
        Array.prototype.slice
            .call(caption.querySelectorAll('[data-rotrade-synthetic]'))
            .forEach(function (n) {
                n.remove();
            });
        pruneEmptyCaptionValuesContainer(caption);
    }
    function itemCardPriceFromAugmentedNode(el) {
        const p = el.closest('.item-card-price');
        if (p) {
            return p;
        }
        const pv = el.closest('.item-price-value');
        if (pv) {
            return pv;
        }
        const cap = el.closest('.item-card-caption');
        return cap ? cap.querySelector('.item-card-price') : null;
    }
    function itemCardRootFromPriceEl(priceEl) {
        if (!priceEl || !priceEl.closest) {
            return null;
        }
        return (
            priceEl.closest('li.trade-item-card') ||
            priceEl.closest('.catalog-item-container') ||
            priceEl.closest('#item-details')
        );
    }
    function setInlineImportant(el, prop, value) {
        if (!el || !el.style) {
            return;
        }
        el.style.setProperty(prop, value, 'important');
    }
    function enforceUnclampedCaptionLayout(priceEl) {
        if (!priceEl) {
            return;
        }
        const caption = captionScopeFromPriceEl(priceEl);
        if (!caption || !caption.querySelector('[data-rotrade-caption-values]')) {
            return;
        }
        const wrap = caption.querySelector('[data-rotrade-caption-values]');
        if (caption.classList.contains('price-info')) {
            const itemDetails = priceEl.closest('#item-details');
            if (itemDetails) {
                setInlineImportant(itemDetails, 'height', 'auto');
                setInlineImportant(itemDetails, 'max-height', 'none');
                setInlineImportant(itemDetails, 'overflow', 'visible');
            }
            setInlineImportant(caption, 'height', 'auto');
            setInlineImportant(caption, 'max-height', 'none');
            setInlineImportant(caption, 'overflow', 'visible');
            setInlineImportant(priceEl, 'height', 'auto');
            setInlineImportant(priceEl, 'max-height', 'none');
            setInlineImportant(priceEl, 'overflow', 'visible');
            setInlineImportant(priceEl, 'text-overflow', 'clip');
            setInlineImportant(priceEl, 'white-space', 'nowrap');
            setInlineImportant(priceEl, 'min-height', '0');
            if (wrap) {
                setInlineImportant(wrap, 'display', 'flex');
                setInlineImportant(wrap, 'flex-direction', 'column');
                setInlineImportant(wrap, 'width', '100%');
                setInlineImportant(wrap, 'overflow', 'visible');
                setInlineImportant(wrap, 'min-height', 'min-content');
            }
            return;
        }
        const card = itemCardRootFromPriceEl(priceEl);
        const container = card && card.querySelector('.item-card-container');
        const link = card && card.querySelector('.item-card-link');
        [card, container, link, caption].forEach(function (el) {
            setInlineImportant(el, 'height', 'auto');
            setInlineImportant(el, 'max-height', 'none');
            setInlineImportant(el, 'overflow', 'visible');
        });
        setInlineImportant(priceEl, 'height', 'auto');
        setInlineImportant(priceEl, 'max-height', 'none');
        setInlineImportant(priceEl, 'overflow', 'visible');
        setInlineImportant(priceEl, 'text-overflow', 'clip');
        setInlineImportant(priceEl, 'white-space', 'nowrap');
        setInlineImportant(priceEl, 'min-height', '0');
        if (wrap) {
            setInlineImportant(wrap, 'display', 'flex');
            setInlineImportant(wrap, 'flex-direction', 'column');
            setInlineImportant(wrap, 'width', '100%');
            setInlineImportant(wrap, 'overflow', 'visible');
            setInlineImportant(wrap, 'min-height', 'min-content');
        }
    }
    function syncPriceCellInlineLayout(priceEl) {
        if (!priceEl) {
            return;
        }
        const caption = captionScopeFromPriceEl(priceEl);
        if (caption && caption.querySelector('[data-rotrade-caption-values]')) {
            enforceUnclampedCaptionLayout(priceEl);
            return;
        }
        const hasAug = priceEl.querySelector('[data-rotrade-usd], [data-rotrade-synthetic]');
        if (hasAug) {
            priceEl.style.minHeight = '108px';
            priceEl.style.height = 'auto';
            priceEl.style.maxHeight = 'none';
            priceEl.style.overflow = 'visible';
            priceEl.style.whiteSpace = 'normal';
            priceEl.style.textOverflow = 'clip';
        } else {
            priceEl.style.minHeight = '';
            priceEl.style.height = '';
            priceEl.style.maxHeight = '';
            priceEl.style.overflow = '';
            priceEl.style.whiteSpace = '';
            priceEl.style.textOverflow = '';
        }
    }
    function applyTradeItemCardRoValkMargin(card) {
        if (!card || !card.style) {
            return;
        }
        card.style.marginBottom = '0';
        if (!card.querySelector('[data-rotrade-caption-values]')) {
            return;
        }
        if (card.id === 'item-details') {
            card.style.height = 'auto';
            card.style.maxHeight = 'none';
            card.style.overflow = 'visible';
            const priceEl = card.querySelector('.item-price-value');
            if (priceEl) {
                enforceUnclampedCaptionLayout(priceEl);
            }
            return;
        }
        card.style.height = 'auto';
        card.style.maxHeight = 'none';
        card.style.overflow = 'visible';
        const container = card.querySelector('.item-card-container');
        if (container && container.style) {
            container.style.height = 'auto';
            container.style.maxHeight = 'none';
            container.style.overflow = 'visible';
        }
        const link = card.querySelector('.item-card-link');
        if (link && link.style) {
            link.style.height = 'auto';
            link.style.maxHeight = 'none';
            link.style.overflow = 'visible';
        }
        const cap = card.querySelector('.item-card-caption');
        if (cap && cap.style) {
            cap.style.height = 'auto';
            cap.style.maxHeight = 'none';
            cap.style.overflow = 'visible';
        }
        const priceEl = card.querySelector('.item-card-caption .item-card-price');
        if (priceEl) {
            enforceUnclampedCaptionLayout(priceEl);
        }
    }
    function findUsdValueSpanForItem(priceEl, itemIdStr) {
        const caption = captionScopeFromPriceEl(priceEl);
        const row = findUsdRowForItem(caption, itemIdStr);
        return row ? row.querySelector('span.valueSpan.text-robux') : null;
    }
    function applyUsdCurrencyIconInlineStyles(iconEl) {
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
        iconEl.style.backgroundRepeat = 'no-repeat';
        iconEl.style.backgroundPosition = 'center';
        iconEl.style.width = '19px';
        iconEl.style.height = '19px';
        iconEl.style.marginTop = '0';
        iconEl.style.marginRight = '6px';
        iconEl.style.marginLeft = '0';
        iconEl.style.transform = 'translateY(2px)';
        iconEl.style.backgroundColor = 'transparent';
        iconEl.style.textAlign = 'center';
        iconEl.style.lineHeight = '19px';
        iconEl.style.fontWeight = '800';
        iconEl.style.fontFamily =
            '"Builder Sans", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif';
    }
    function removeTradeDetailUsdRows(detail) {
        if (!detail) {
            return;
        }
        detail.querySelectorAll('[data-rotrade-synthetic]').forEach(function (el) {
            const price = itemCardPriceFromAugmentedNode(el);
            if (price) {
                price.classList.remove('rotrade-item-price-has-synthetic-rol');
            }
            el.remove();
        });
        detail.querySelectorAll('[data-rotrade-usd]').forEach(function (el) {
            const price = itemCardPriceFromAugmentedNode(el);
            if (price) {
                price.classList.remove('rotrade-item-price-has-usd');
            }
            el.remove();
        });
        detail.querySelectorAll('[data-rotrade-offer-totals]').forEach(function (el) {
            el.remove();
        });
        detail.querySelectorAll('[data-rotrade-trade-summary]').forEach(function (el) {
            el.remove();
        });
        detail.querySelectorAll('.item-card-caption').forEach(pruneEmptyCaptionValuesContainer);
        detail
            .querySelectorAll('.item-card-caption .item-card-price')
            .forEach(syncPriceCellInlineLayout);
    }
    function isRobloxLightTheme() {
        return !(
            (document.body && document.body.classList.contains('dark-theme')) ||
            (document.documentElement && document.documentElement.classList.contains('dark-theme'))
        );
    }
    function appendTradeSummaryChip(container, label, diff, base, formatter, prefix) {
        const chip = document.createElement('div');
        chip.setAttribute('data-toggle', 'tooltip');
        chip.setAttribute('title', '');
        chip.style.display = 'flex';
        chip.style.alignItems = 'center';
        chip.style.justifyContent = 'center';
        chip.style.height = '30px';
        if (isRobloxLightTheme()) {
            chip.style.backgroundColor = 'rgb(222, 225, 227)';
            chip.style.color = '#1b1e21';
        } else {
            chip.style.backgroundColor = 'rgb(45, 47, 48)';
        }
        chip.style.padding = '5px';
        chip.style.cursor = 'default';
        chip.style.flexGrow = '0';
        chip.style.flexBasis = 'calc(50% - 8px)';
        chip.style.minWidth = '220px';
        chip.style.fontSize = '20px';
        chip.style.whiteSpace = 'nowrap';
        const content = document.createElement('span');
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        const trend = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        trend.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        trend.setAttribute('width', '24');
        trend.setAttribute('height', '24');
        trend.setAttribute('viewBox', '0 0 24 24');
        trend.style.transform = 'scale(1.3)';
        trend.style.marginRight = '3px';
        const trendPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        trendPath.setAttribute('fill', 'currentColor');
        if (diff > 0) {
            trend.style.color = 'rgb(32, 215, 66)';
            trendPath.setAttribute('d', 'M15 20H9v-8H4.16L12 4.16L19.84 12H15v8Z');
        } else if (diff < 0) {
            trend.style.color = 'rgb(255, 93, 93)';
            trendPath.setAttribute('d', 'M15 4H9v8H4.16L12 19.84L19.84 12H15V4Z');
        } else {
            trend.style.color = 'rgb(156, 163, 175)';
            trendPath.setAttribute('d', 'M4 14h16v-2H4v2Zm0-4h16V8H4v2Z');
        }
        trend.appendChild(trendPath);
        const valAbs = Math.abs(diff);
        const mainSign = diff > 0 ? '+' : diff < 0 ? '-' : '';
        const mainValue = (prefix || '') + formatter(valAbs);
        let pctTxt = '—%';
        if (isFinite(base) && base > 0) {
            const pct = (diff / base) * 100;
            const pctSign = pct > 0 ? '+' : pct < 0 ? '-' : '';
            pctTxt = pctSign + Math.abs(pct).toFixed(0) + '%';
        }
        const text = document.createElement('span');
        const labelForTooltip = label === '$' ? 'USD' : label;
        if (diff === 0) {
            text.textContent = '=';
            chip.setAttribute(
                'data-original-title',
                'This trade is equal in ' + labelForTooltip + '.'
            );
        } else {
            text.textContent = mainSign + mainValue + ' ' + label + ' (' + pctTxt + ')';
            chip.setAttribute(
                'data-original-title',
                'You are ' +
                    (diff > 0 ? 'gaining ' : 'losing ') +
                    formatter(valAbs) +
                    ' ' +
                    labelForTooltip +
                    ' on this trade, and ' +
                    (diff > 0 ? 'winning' : 'losing') +
                    ' in ' +
                    labelForTooltip +
                    ' by ' +
                    pctTxt +
                    '.'
            );
        }
        if (diff !== 0) {
            content.appendChild(trend);
        }
        content.appendChild(text);
        chip.appendChild(content);
        container.appendChild(chip);
        return chip;
    }
    function offeredRobuxFromTradeOffer(offer) {
        if (!offer) {
            return 0;
        }
        const robuxValueEl = offer.querySelector('.robux-line .robux-line-value');
        if (!robuxValueEl) {
            return 0;
        }
        const raw = (robuxValueEl.textContent || '').replace(/,/g, '').trim();
        if (!raw) {
            return 0;
        }
        const robux = parseInt(raw, 10);
        if (!isFinite(robux) || robux <= 0) {
            return 0;
        }
        return robux;
    }
    function injectTradeSummaryBetweenOffers(detail, items, seq, usdPer1k, showWinLoss, usdEnabled) {
        if (seq !== usdInjectSeq) {
            return;
        }
        if (!detail || !items || typeof items !== 'object') {
            return;
        }
        function restoreWinLossAnchors() {
            detail.querySelectorAll('.trade-list-detail-offer .rbx-divider').forEach(
                function (el) {
                    if (!el || !el.style) {
                        return;
                    }
                    el.style.removeProperty('display');
                    el.style.removeProperty('position');
                    el.style.removeProperty('overflow');
                    el.style.removeProperty('background-color');
                    el.style.removeProperty('padding-top');
                    el.style.removeProperty('border-top');
                }
            );
        }
        if (!showWinLoss) {
            detail.querySelectorAll('[data-rotrade-trade-summary]').forEach(function (el) {
                el.remove();
            });
            restoreWinLossAnchors();
            return;
        }
        const per1k =
            typeof usdPer1k === 'number' && isFinite(usdPer1k) && usdPer1k > 0 ? usdPer1k : 4;
        const offers = Array.prototype.slice.call(
            detail.querySelectorAll('.trade-list-detail-offer')
        );
        if (offers.length < 2) {
            detail.querySelectorAll('[data-rotrade-trade-summary]').forEach(function (el) {
                el.remove();
            });
            restoreWinLossAnchors();
            return;
        }
        const totals = {
            given: {
                rap: 0,
                value: 0,
                usd: 0,
                robux: 0,
            },
            received: {
                rap: 0,
                value: 0,
                usd: 0,
                robux: 0,
            },
        };
        offers.forEach(function (offer) {
            const h3 = offer.querySelector('h3.trade-list-detail-offer-header');
            const bucket = classifyOfferHeader(h3 ? h3.textContent.trim() : '');
            if (bucket !== 'given' && bucket !== 'received') {
                return;
            }
            const cards = offer.querySelectorAll('li.trade-item-card');
            cards.forEach(function (card) {
                const pair = resolveItemIdPair(card);
                if (!pair) {
                    return;
                }
                const arr = lookupRolimonArrayForTradeItem(items, pair);
                if (!arr) {
                    return;
                }
                const rap = rolimonsRapFromItemArray(arr);
                const val = rolimonsValueFromItemArray(arr);
                const usd = usdFromRolimonsValueArray(arr, per1k);
                if (rap !== null) {
                    totals[bucket].rap += rap;
                }
                if (val !== null) {
                    totals[bucket].value += val;
                }
                if (usd !== null) {
                    totals[bucket].usd += usd;
                }
            });
            const offeredRobux = offeredRobuxFromTradeOffer(offer);
            if (offeredRobux > 0) {
                totals[bucket].rap += offeredRobux;
                totals[bucket].value += offeredRobux;
                totals[bucket].usd += window.TradeDetailRobuxUsd.robuxAmountToUsd(
                    offeredRobux,
                    per1k
                );
                totals[bucket].robux += offeredRobux;
            }
        });
        const rapDiff = totals.received.rap - totals.given.rap;
        const valueDiff = totals.received.value - totals.given.value;
        const usdDiff = totals.received.usd - totals.given.usd;
        let summary = detail.querySelector('[data-rotrade-trade-summary]');
        if (!summary) {
            summary = document.createElement('div');
            summary.id = 'winLossStatsContainer';
            summary.setAttribute('data-rotrade-trade-summary', '1');
            const secondOffer = offers[1];
            const divider = secondOffer && secondOffer.querySelector('.rbx-divider');
            if (divider && divider.parentNode === secondOffer) {
                divider.style.display = 'none';
                secondOffer.insertBefore(summary, divider);
            } else if (secondOffer) {
                secondOffer.insertBefore(summary, secondOffer.firstChild);
            } else {
                const anchor0 = offers[0];
                anchor0.parentNode.insertBefore(summary, anchor0.nextSibling);
            }
        }
        summary.innerHTML = '';
        summary.style.position = 'relative';
        summary.style.top = '';
        summary.style.left = '';
        summary.style.right = '';
        summary.style.margin = '6px auto 10px auto';
        summary.style.padding = '1px';
        summary.style.width = '100%';
        summary.style.display = 'flex';
        summary.style.flexWrap = 'wrap';
        summary.style.gap = '15px';
        summary.style.justifyContent = 'center';
        const rapChip = appendTradeSummaryChip(
            summary,
            'RAP',
            rapDiff,
            totals.given.rap,
            function (n) {
                return Math.round(n).toLocaleString('en-US');
            }
        );
        const valueChip = appendTradeSummaryChip(
            summary,
            'Value',
            valueDiff,
            totals.given.value,
            function (n) {
                return Math.round(n).toLocaleString('en-US');
            }
        );
        const usdChip = usdEnabled
            ? appendTradeSummaryChip(
                  summary,
                  '$',
                  usdDiff,
                  totals.given.usd,
                  function (n) {
                      return formatUsdAmountDisplay(n);
                  }
              )
            : null;
        if (rapChip) {
            rapChip.style.order = '1';
        }
        if (valueChip) {
            valueChip.style.order = '2';
        }
        if (usdChip) {
            usdChip.style.order = '3';
            usdChip.style.flexBasis = 'calc(50% - 8px)';
        }
    }
    function injectOfferTotalsRowsForTradeDetail(detail, items, seq, usdPer1k, showUsd) {
        if (seq !== usdInjectSeq) {
            return;
        }
        if (!detail || !items || typeof items !== 'object') {
            return;
        }
        const per1k =
            typeof usdPer1k === 'number' && isFinite(usdPer1k) && usdPer1k > 0 ? usdPer1k : 4;
        const offers = detail.querySelectorAll('.trade-list-detail-offer');
        offers.forEach(function (offer) {
            if (offer && offer.style) {
                offer.style.setProperty('padding-bottom', '80px', 'important');
            }
            const h3 = offer.querySelector('h3.trade-list-detail-offer-header');
            const bucket = classifyOfferHeader(h3 ? h3.textContent.trim() : '');
            if (bucket !== 'given' && bucket !== 'received') {
                return;
            }
            let totalRol = 0;
            let totalUsd = 0;
            const cards = offer.querySelectorAll('li.trade-item-card');
            cards.forEach(function (card) {
                const pair = resolveItemIdPair(card);
                if (!pair) {
                    return;
                }
                const arr = lookupRolimonArrayForTradeItem(items, pair);
                if (!arr) {
                    return;
                }
                const val = rolimonsValueFromItemArray(arr);
                if (val !== null) {
                    totalRol += val;
                }
                const usd = usdFromRolimonsValueArray(arr, per1k);
                if (usd !== null) {
                    totalUsd += usd;
                }
            });
            const totalValueRow = offer.querySelector('.robux-line .text-lead')
                ? offer.querySelector('.robux-line .text-lead').closest('.robux-line')
                : null;
            if (!totalValueRow) {
                return;
            }
            const nativeAmount = totalValueRow.querySelector('.robux-line-amount');
            if (!nativeAmount) {
                return;
            }
            const hasExternalRolimonsInTotal = Array.prototype.some.call(
                nativeAmount.querySelectorAll('.icon-rolimons'),
                function (icon) {
                    return !icon.closest('[data-rotrade-offer-totals]');
                }
            );
            nativeAmount.style.height = 'auto';
            nativeAmount.style.minHeight = '0';
            const rolTxt = formatRolimonsValueDisplay(totalRol);
            const usdTxt = formatUsdAmountDisplay(totalUsd);
            let amountWrap = totalValueRow.querySelector('[data-rotrade-offer-totals]');
            if (!amountWrap) {
                amountWrap = document.createElement('span');
                amountWrap.setAttribute('data-rotrade-offer-totals', '1');
                nativeAmount.appendChild(document.createElement('br'));
                nativeAmount.appendChild(amountWrap);
            }
            amountWrap.innerHTML = '';
            amountWrap.style.display = 'inline-block';
            amountWrap.style.lineHeight = '24px';
            amountWrap.style.height = 'auto';
            amountWrap.style.minHeight = '0';
            if (!hasExternalRolimonsInTotal) {
                const rolIcon = document.createElement('span');
                rolIcon.className = 'icon icon-rolimons';
                rolIcon.setAttribute('aria-hidden', 'true');
                applyRolimonsValkIconStyles(rolIcon);
                rolIcon.style.width = '21px';
                rolIcon.style.height = '21px';
                rolIcon.style.marginRight = '6px';
                rolIcon.style.transform = 'translateY(2px)';
                const rolValue = document.createElement('span');
                rolValue.className = 'valueSpan text-robux-lg';
                rolValue.textContent = rolTxt;
                amountWrap.appendChild(rolIcon);
                amountWrap.appendChild(rolValue);
                if (showUsd) {
                    amountWrap.appendChild(document.createElement('br'));
                }
            }
            if (!showUsd) {
                return;
            }
            const usdIcon = document.createElement('span');
            usdIcon.className = 'icon rotrade-usd-currency';
            usdIcon.setAttribute('aria-hidden', 'true');
            usdIcon.textContent = '$';
            applyUsdCurrencyIconInlineStyles(usdIcon);
            usdIcon.style.width = '20px';
            usdIcon.style.height = '20px';
            usdIcon.style.lineHeight = '20px';
            usdIcon.style.marginRight = '6px';
            usdIcon.style.transform = 'translateY(2px)';
            const usdValue = document.createElement('span');
            usdValue.className = 'valueSpan text-robux-lg';
            usdValue.textContent = usdTxt;
            amountWrap.appendChild(usdIcon);
            amountWrap.appendChild(usdValue);
        });
    }
    function lookupRolimonArrayForTradeItem(items, pair) {
        if (!items || !pair) {
            return null;
        }
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        function tryKey(key) {
            if (key == null || key === '') {
                return null;
            }
            const v = items[key] || items[String(key)] || items[Number(key)];
            return v && Array.isArray(v) ? v : null;
        }
        const ordered = [];
        function add(k) {
            if (k == null || k === '') {
                return;
            }
            const s = String(k);
            if (ordered.indexOf(s) === -1) {
                ordered.push(s);
            }
        }
        const nItem = normalize(pair.itemId);
        const nRaw = normalize(pair.rawItemId);
        add(nItem);
        add(pair.itemId);
        if (pair.rawItemId != null && String(pair.rawItemId) !== String(nItem)) {
            add(nRaw);
            add(pair.rawItemId);
        }
        const aliases =
            window.TradeItemIdAliases && window.TradeItemIdAliases.TRADE_ITEM_ID_ALIASES;
        const canon = nItem || String(pair.itemId);
        if (aliases && canon) {
            const canonStr = String(canon);
            const fromKeys = Object.keys(aliases);
            for (let i = 0; i < fromKeys.length; i++) {
                if (String(aliases[fromKeys[i]]) === canonStr) {
                    add(fromKeys[i]);
                }
            }
        }
        for (let i = 0; i < ordered.length; i++) {
            const hit = tryKey(ordered[i]);
            if (hit) {
                return hit;
            }
        }
        return null;
    }
    function injectSyntheticRolimonsRowsInRoot(root, items) {
        if (!root || !items || typeof items !== 'object') {
            return;
        }
        const normalizeItemId =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        const prices = root.querySelectorAll(
            'li.trade-item-card .item-card-caption .item-card-price, .catalog-item-container .item-card-caption .item-card-price, #item-details .price-row-container .item-price-value'
        );
        prices.forEach(function (priceEl) {
            const card = itemCardRootFromPriceEl(priceEl);
            if (!card) {
                return;
            }
            const caption = captionScopeFromPriceEl(priceEl);
            let pair = resolveItemIdPair(card);
            if (window.TradeDetailPath.isMarketplaceItemDetailPage()) {
                const detailPair = window.TradeDetailPath.resolveMarketplaceItemDetailPair();
                if (detailPair && (priceEl.closest('#item-details') || !pair)) {
                    pair = detailPair;
                }
            }
            if (!pair) {
                return;
            }
            const canonicalForKey = normalizeItemId(pair.itemId) || String(pair.itemId);
            const itemIdStr = String(canonicalForKey);
            const existingValSpan = findSyntheticValueSpanForItem(priceEl, itemIdStr);
            if (hasNativeRolimonsValueRow(priceEl)) {
                if (
                    existingValSpan ||
                    (caption && caption.querySelector('[data-rotrade-synthetic]'))
                ) {
                    removeSyntheticAugmentationFromCaption(caption);
                    priceEl.classList.remove('rotrade-item-price-has-synthetic-rol');
                    syncPriceCellInlineLayout(priceEl);
                }
                return;
            }
            const rawArr = lookupRolimonArrayForTradeItem(items, pair);
            const val = rawArr ? rolimonsValueFromItemArray(rawArr) : null;
            if (val === null) {
                const r = findSyntheticRolimonsRowForItem(caption, itemIdStr);
                if (r) {
                    r.remove();
                }
                priceEl.classList.remove('rotrade-item-price-has-synthetic-rol');
                pruneEmptyCaptionValuesContainer(caption);
                syncPriceCellInlineLayout(priceEl);
                applyTradeItemCardRoValkMargin(card);
                return;
            }
            const displayText = formatRolimonsValueDisplay(val);
            const rolimonsHref = 'https://www.rolimons.com/item/' + encodeURIComponent(itemIdStr);
            if (existingValSpan) {
                if (existingValSpan.getAttribute('data-rotrade-item-id') === itemIdStr) {
                    priceEl.classList.add('rotrade-item-price-has-synthetic-rol');
                    if (existingValSpan.textContent !== displayText) {
                        existingValSpan.textContent = displayText;
                    }
                    const row = findSyntheticRolimonsRowForItem(caption, itemIdStr);
                    if (row) {
                        row.querySelectorAll('a[href*="rolimons.com/item"]').forEach(
                            function (legacyA) {
                                if (
                                    legacyA.classList.contains(
                                        'rotrade-caption-rolimons-value-link'
                                    )
                                ) {
                                    return;
                                }
                                if (legacyA.querySelector('.icon.icon-link')) {
                                    legacyA.remove();
                                }
                            }
                        );
                        let valueLink = existingValSpan.closest(
                            'a.rotrade-caption-rolimons-value-link'
                        );
                        if (!valueLink) {
                            valueLink = document.createElement('a');
                            valueLink.className = 'rotrade-caption-rolimons-value-link';
                            valueLink.href = rolimonsHref;
                            valueLink.target = '_blank';
                            valueLink.rel = 'noopener noreferrer';
                            valueLink.setAttribute('title', 'View item on Rolimons');
                            const parent = existingValSpan.parentNode;
                            if (parent) {
                                parent.insertBefore(valueLink, existingValSpan);
                                valueLink.appendChild(existingValSpan);
                            }
                        } else if (valueLink.getAttribute('href') !== rolimonsHref) {
                            valueLink.setAttribute('href', rolimonsHref);
                        }
                    }
                    syncPriceCellInlineLayout(priceEl);
                    applyTradeItemCardRoValkMargin(card);
                    return;
                }
                removeSyntheticAugmentationFromCaption(caption);
            }
            priceEl.classList.add('rotrade-item-price-has-synthetic-rol');
            const wrap = getOrCreateCaptionValuesContainer(priceEl);
            if (!wrap) {
                return;
            }
            const row = document.createElement('div');
            row.className = 'rotrade-row rotrade-row-rolimons';
            row.setAttribute('data-rotrade-synthetic', '1');
            row.setAttribute('data-rotrade-item-id', itemIdStr);
            const iconSpan = document.createElement('span');
            iconSpan.className = 'icon icon-rolimons';
            iconSpan.setAttribute('aria-hidden', 'true');
            applyRolimonsValkIconStyles(iconSpan);
            const valSpan = document.createElement('span');
            valSpan.className = 'valueSpan text-robux';
            valSpan.setAttribute('data-rotrade-synthetic', '1');
            valSpan.setAttribute('data-rotrade-item-id', itemIdStr);
            valSpan.textContent = displayText;
            const valueLink = document.createElement('a');
            valueLink.className = 'rotrade-caption-rolimons-value-link';
            valueLink.href = rolimonsHref;
            valueLink.target = '_blank';
            valueLink.rel = 'noopener noreferrer';
            valueLink.setAttribute('title', 'View item on Rolimons');
            valueLink.appendChild(valSpan);
            row.appendChild(iconSpan);
            row.appendChild(valueLink);
            const usdRow = wrap.querySelector('.rotrade-row-usd[data-rotrade-usd]');
            if (usdRow) {
                wrap.insertBefore(row, usdRow);
            } else {
                wrap.appendChild(row);
            }
            syncPriceCellInlineLayout(priceEl);
            applyTradeItemCardRoValkMargin(card);
        });
    }
    function injectSyntheticRolimonsValueRowsForTradeDetail(detail, items, seq) {
        if (seq !== usdInjectSeq) {
            return;
        }
        if (!detail || !items || typeof items !== 'object') {
            return;
        }
        injectSyntheticRolimonsRowsInRoot(detail, items);
    }
    function injectUsdRowsInRoot(root, items, usdPer1k) {
        if (!root || !items || typeof items !== 'object') {
            return;
        }
        const per1k =
            typeof usdPer1k === 'number' && isFinite(usdPer1k) && usdPer1k > 0 ? usdPer1k : 4;
        const normalizeItemId =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        const prices = root.querySelectorAll(
            'li.trade-item-card .item-card-caption .item-card-price, .catalog-item-container .item-card-caption .item-card-price, #item-details .price-row-container .item-price-value'
        );
        prices.forEach(function (priceEl) {
            const card = itemCardRootFromPriceEl(priceEl);
            if (!card) {
                return;
            }
            const caption = captionScopeFromPriceEl(priceEl);
            let pair = resolveItemIdPair(card);
            if (window.TradeDetailPath.isMarketplaceItemDetailPage()) {
                const detailPair = window.TradeDetailPath.resolveMarketplaceItemDetailPair();
                if (detailPair && (priceEl.closest('#item-details') || !pair)) {
                    pair = detailPair;
                }
            }
            if (!pair) {
                return;
            }
            const canonicalForKey = normalizeItemId(pair.itemId) || String(pair.itemId);
            const itemIdStr = String(canonicalForKey);
            const rawArr = lookupRolimonArrayForTradeItem(items, pair);
            const usd = rawArr ? usdFromRolimonsValueArray(rawArr, per1k) : null;
            const existingAmt = findUsdValueSpanForItem(priceEl, itemIdStr);
            if (existingAmt) {
                if (usd === null) {
                    if (caption) {
                        caption
                            .querySelectorAll('.rotrade-row-usd[data-rotrade-usd]')
                            .forEach(function (n) {
                                n.remove();
                            });
                        pruneEmptyCaptionValuesContainer(caption);
                    }
                    priceEl.classList.remove('rotrade-item-price-has-usd');
                    syncPriceCellInlineLayout(priceEl);
                } else {
                    priceEl.classList.add('rotrade-item-price-has-usd');
                    const displayText = formatUsdAmountDisplay(usd);
                    if (existingAmt.textContent !== displayText) {
                        existingAmt.textContent = displayText;
                    }
                    const rolimonsHref =
                        'https://www.rolimons.com/item/' + encodeURIComponent(itemIdStr);
                    let usdLink = existingAmt.closest('a.rotrade-caption-usd-value-link');
                    if (!usdLink) {
                        usdLink = document.createElement('a');
                        usdLink.className = 'rotrade-caption-usd-value-link';
                        usdLink.href = rolimonsHref;
                        usdLink.target = '_blank';
                        usdLink.rel = 'noopener noreferrer';
                        usdLink.setAttribute('title', 'View item on Rolimons');
                        const parent = existingAmt.parentNode;
                        if (parent) {
                            parent.insertBefore(usdLink, existingAmt);
                            usdLink.appendChild(existingAmt);
                        }
                    } else if (usdLink.getAttribute('href') !== rolimonsHref) {
                        usdLink.setAttribute('href', rolimonsHref);
                    }
                    syncPriceCellInlineLayout(priceEl);
                    applyTradeItemCardRoValkMargin(card);
                }
                return;
            }
            const hadOtherUsd =
                caption && caption.querySelector('.rotrade-row-usd[data-rotrade-usd]');
            if (hadOtherUsd) {
                caption
                    .querySelectorAll('.rotrade-row-usd[data-rotrade-usd]')
                    .forEach(function (n) {
                        n.remove();
                    });
                pruneEmptyCaptionValuesContainer(caption);
                syncPriceCellInlineLayout(priceEl);
            }
            if (usd === null) {
                return;
            }
            const displayText = formatUsdAmountDisplay(usd);
            const rolimonsHref = 'https://www.rolimons.com/item/' + encodeURIComponent(itemIdStr);
            priceEl.classList.add('rotrade-item-price-has-usd');
            const wrap = getOrCreateCaptionValuesContainer(priceEl);
            if (!wrap) {
                return;
            }
            const usdRow = document.createElement('div');
            usdRow.className = 'rotrade-row rotrade-row-usd';
            usdRow.setAttribute('data-rotrade-usd', '1');
            usdRow.setAttribute('data-rotrade-item-id', itemIdStr);
            const iconEl = document.createElement('span');
            iconEl.className = 'icon rotrade-usd-currency';
            iconEl.setAttribute('aria-hidden', 'true');
            iconEl.textContent = '$';
            const amount = document.createElement('span');
            amount.className = 'valueSpan text-robux';
            amount.setAttribute('data-rotrade-item-id', itemIdStr);
            amount.textContent = displayText;
            const amountLink = document.createElement('a');
            amountLink.className = 'rotrade-caption-usd-value-link';
            amountLink.href = rolimonsHref;
            amountLink.target = '_blank';
            amountLink.rel = 'noopener noreferrer';
            amountLink.setAttribute('title', 'View item on Rolimons');
            amountLink.appendChild(amount);
            applyUsdCurrencyIconInlineStyles(iconEl);
            usdRow.appendChild(iconEl);
            usdRow.appendChild(amountLink);
            wrap.appendChild(usdRow);
            syncPriceCellInlineLayout(priceEl);
            applyTradeItemCardRoValkMargin(card);
        });
    }
    function injectUsdRowsForTradeDetail(detail, items, seq, usdPer1k) {
        if (seq !== usdInjectSeq) {
            return;
        }
        if (!detail || !items || typeof items !== 'object') {
            return;
        }
        injectUsdRowsInRoot(detail, items, usdPer1k);
    }
    function removeUsdRowsFromRoot(root) {
        if (!root) {
            return;
        }
        root.querySelectorAll('[data-rotrade-usd]').forEach(function (el) {
            const link = el.closest('a.rotrade-caption-usd-value-link');
            const target = link || el;
            const price = itemCardPriceFromAugmentedNode(target);
            if (price) {
                price.classList.remove('rotrade-item-price-has-usd');
            }
            const node = link && link.parentNode === el.parentNode ? link : target;
            if (node && node.parentNode) {
                node.remove();
            } else if (target && target.parentNode) {
                target.remove();
            }
        });
        root.querySelectorAll('.item-card-caption').forEach(pruneEmptyCaptionValuesContainer);
        root.querySelectorAll('.item-card-caption .item-card-price').forEach(
            syncPriceCellInlineLayout
        );
    }
    function removeCatalogResellerUsdRows() {
        document.querySelectorAll('[data-rotrade-reseller-usd]').forEach(function (line) {
            const stack = line.parentNode;
            line.remove();
            if (stack && stack.classList.contains('rotrade-reseller-price-stack')) {
                const robuxSpan = stack.querySelector('.text-robux');
                if (robuxSpan && stack.parentNode) {
                    stack.parentNode.insertBefore(robuxSpan, stack);
                    stack.remove();
                }
            }
        });
    }
    function offeredRobuxFromTradeRequestOffer(offer) {
        if (!offer) {
            return 0;
        }
        const input = offer.querySelector('input[name="robux"]');
        if (!input) {
            return 0;
        }
        const raw = String(input.value || '').replace(/\D/g, '');
        const n = parseInt(raw, 10);
        if (!isFinite(n) || n <= 0) {
            return 0;
        }
        return n;
    }
    function findTradeRequestTotalValueRobuxLine(offer) {
        let found = null;
        offer.querySelectorAll('.robux-line').forEach(function (line) {
            const lead = line.querySelector('.text-lead');
            if (lead && /total\s*value/i.test((lead.textContent || '').trim())) {
                found = line;
            }
        });
        return found;
    }
    function forEachTradeRequestOfferSlotItem(offer, fn) {
        if (!offer || typeof fn !== 'function') {
            return;
        }
        offer.querySelectorAll('.trade-request-item').forEach(function (slotEl) {
            if (!slotEl || slotEl.classList.contains('blank-item')) {
                return;
            }
            if (!slotEl.querySelector('thumbnail-2d, .thumbnail-2d-container')) {
                return;
            }
            fn(slotEl);
        });
    }
    function injectTradeRequestOfferTotals(root, items, usdPer1k, includeUsd) {
        if (!root || !items || typeof items !== 'object') {
            return;
        }
        const per1k =
            typeof usdPer1k === 'number' && isFinite(usdPer1k) && usdPer1k > 0 ? usdPer1k : 4;
        const showUsd = includeUsd !== false;
        const offers = root.querySelectorAll('.trade-request-window-offer');
        offers.forEach(function (offer) {
            let totalRol = 0;
            let totalUsd = 0;
            forEachTradeRequestOfferSlotItem(offer, function (slotEl) {
                const pair = resolveItemIdPair(slotEl);
                if (!pair) {
                    return;
                }
                const arr = lookupRolimonArrayForTradeItem(items, pair);
                if (!arr) {
                    return;
                }
                const val = rolimonsValueFromItemArray(arr);
                if (val !== null) {
                    totalRol += val;
                }
                const usd = usdFromRolimonsValueArray(arr, per1k);
                if (usd !== null) {
                    totalUsd += usd;
                }
            });
            const offeredRobux = offeredRobuxFromTradeRequestOffer(offer);
            if (offeredRobux > 0) {
                totalRol += offeredRobux;
                totalUsd += window.TradeDetailRobuxUsd.robuxAmountToUsd(offeredRobux, per1k);
            }
            const totalValueRow = findTradeRequestTotalValueRobuxLine(offer);
            if (!totalValueRow) {
                return;
            }
            const nativeAmount = totalValueRow.querySelector('.robux-line-amount');
            if (!nativeAmount) {
                return;
            }
            const hasExternalRolimonsInTotal = Array.prototype.some.call(
                nativeAmount.querySelectorAll('.icon-rolimons'),
                function (icon) {
                    return !icon.closest('[data-rotrade-trade-request-offer-totals]');
                }
            );
            nativeAmount.style.height = 'auto';
            nativeAmount.style.minHeight = '0';
            const rolTxt = formatRolimonsValueDisplay(totalRol);
            const usdTxt = formatUsdAmountDisplay(totalUsd);
            let amountWrap = nativeAmount.querySelector(
                '[data-rotrade-trade-request-offer-totals]'
            );
            if (!amountWrap) {
                amountWrap = document.createElement('span');
                amountWrap.setAttribute('data-rotrade-trade-request-offer-totals', '1');
                amountWrap.style.display = 'block';
                amountWrap.style.marginTop = '4px';
                nativeAmount.appendChild(amountWrap);
            }
            amountWrap.innerHTML = '';
            amountWrap.style.lineHeight = '24px';
            amountWrap.style.height = 'auto';
            amountWrap.style.minHeight = '0';
            amountWrap.style.textAlign = 'left';
            if (!hasExternalRolimonsInTotal) {
                const rolIcon = document.createElement('span');
                rolIcon.className = 'icon icon-rolimons';
                rolIcon.setAttribute('aria-hidden', 'true');
                applyRolimonsValkIconStyles(rolIcon);
                rolIcon.style.width = '21px';
                rolIcon.style.height = '21px';
                rolIcon.style.marginRight = '6px';
                rolIcon.style.transform = 'translateY(2px)';
                const rolValue = document.createElement('span');
                rolValue.className = 'valueSpan text-robux-lg';
                rolValue.textContent = rolTxt;
                amountWrap.appendChild(rolIcon);
                amountWrap.appendChild(rolValue);
                if (showUsd) {
                    amountWrap.appendChild(document.createElement('br'));
                }
            }
            if (!showUsd) {
                if (!amountWrap.childNodes.length) {
                    removeTradeRequestOfferTotalsWrap(amountWrap);
                }
                return;
            }
            const usdIcon = document.createElement('span');
            usdIcon.className = 'icon rotrade-usd-currency';
            usdIcon.setAttribute('aria-hidden', 'true');
            usdIcon.textContent = '$';
            applyUsdCurrencyIconInlineStyles(usdIcon);
            usdIcon.style.width = '20px';
            usdIcon.style.height = '20px';
            usdIcon.style.lineHeight = '20px';
            usdIcon.style.marginRight = '6px';
            usdIcon.style.transform = 'translateY(2px)';
            const usdValue = document.createElement('span');
            usdValue.className = 'valueSpan text-robux-lg';
            usdValue.textContent = usdTxt;
            amountWrap.appendChild(usdIcon);
            amountWrap.appendChild(usdValue);
        });
    }
    function removeTradeRequestOfferTotalsWrap(el) {
        if (!el || !el.parentNode) {
            return;
        }
        const prev = el.previousSibling;
        if (prev && prev.nodeName === 'BR') {
            prev.remove();
        }
        el.remove();
    }
    function clearTradeRequestInventoryPanelAugmentation(panel) {
        if (!panel) {
            return;
        }
        panel.classList.remove('rotrade-trade-inv-augmented');
        panel.querySelectorAll('[data-rotrade-synthetic]').forEach(function (el) {
            const price = itemCardPriceFromAugmentedNode(el);
            if (price) {
                price.classList.remove('rotrade-item-price-has-synthetic-rol');
            }
            el.remove();
        });
        panel.querySelectorAll('[data-rotrade-usd]').forEach(function (el) {
            const price = itemCardPriceFromAugmentedNode(el);
            if (price) {
                price.classList.remove('rotrade-item-price-has-usd');
            }
            el.remove();
        });
        panel.querySelectorAll('.item-card-caption').forEach(pruneEmptyCaptionValuesContainer);
        panel
            .querySelectorAll('.item-card-caption .item-card-price')
            .forEach(syncPriceCellInlineLayout);
    }
    function removeTradeRequestInventoryUsd(panel) {
        const app = document.getElementById('trades-web-app');
        if (app) {
            app.querySelectorAll('[data-rotrade-trade-request-offer-totals]').forEach(
                removeTradeRequestOfferTotalsWrap
            );
            app.querySelectorAll('[data-rotrade-trade-request-value-row]').forEach(function (row) {
                const slot = row.closest('.trade-request-item');
                const itemVal = row.querySelector('.item-value');
                if (slot && itemVal) {
                    slot.insertBefore(itemVal, row);
                }
                row.remove();
            });
            app.querySelectorAll('[data-rotrade-trade-request-slot-values]').forEach(function (el) {
                el.remove();
            });
            app.querySelectorAll('[data-rotrade-trade-request-slot-rolimons]').forEach(
                function (el) {
                    el.remove();
                }
            );
            app.querySelectorAll('.trade-inventory-panel').forEach(
                clearTradeRequestInventoryPanelAugmentation
            );
        } else if (panel) {
            clearTradeRequestInventoryPanelAugmentation(panel);
        }
    }
    function injectTradeRequestInventoryUsd(panel) {
        removeTradeRequestInventoryUsd(panel);
        return Promise.all([getRolimonItemsRaw(), window.TradeDetailRobuxUsd.loadSettings()]).then(
            function (results) {
                const items = results[0];
                const usd = results[1] || {};
                const per1k = typeof usd.per1k === 'number' ? usd.per1k : 4;
                const usdEnabled = usd.enabled !== false;
                const app = document.getElementById('trades-web-app');
                if (!app) {
                    return;
                }
                const panels = app.querySelectorAll('.trade-inventory-panel');
                for (let i = 0; i < panels.length; i++) {
                    const p = panels[i];
                    if (!p.parentNode) {
                        continue;
                    }
                    p.classList.add('rotrade-trade-inv-augmented');
                    injectSyntheticRolimonsRowsInRoot(p, items);
                    if (usdEnabled) {
                        injectUsdRowsInRoot(p, items, per1k);
                    } else {
                        removeUsdRowsFromRoot(p);
                    }
                }
                injectTradeRequestOfferTotals(app, items, per1k, usdEnabled);
            }
        );
    }
    function getRolautotradeUserStats(userId) {
        const key = String(userId);
        if (roautotradeUserStatsResolved.has(key)) {
            return Promise.resolve(roautotradeUserStatsResolved.get(key));
        }
        if (roautotradeUserStatsInflight.has(key)) {
            return roautotradeUserStatsInflight.get(key);
        }
        const p = new Promise(function (resolve, reject) {
            try {
                chrome.runtime.sendMessage(
                    {
                        action: 'fetchRolautotradeUserStats',
                        userId: userId,
                    },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        if (response && response.success && response.data) {
                            resolve(response.data);
                        } else {
                            reject(
                                new Error(
                                    (response && response.error) || 'roautotrade_user_stats_failed'
                                )
                            );
                        }
                    }
                );
            } catch (err) {
                reject(err);
            }
        });
        roautotradeUserStatsInflight.set(key, p);
        p.then(function (data) {
            roautotradeUserStatsResolved.set(key, data);
            roautotradeUserStatsInflight.delete(key);
        }).catch(function () {
            roautotradeUserStatsInflight.delete(key);
        });
        return p;
    }
    function getRolautotradeUserPreferences(userId) {
        const key = String(userId);
        if (roautotradeUserPrefsResolved.has(key)) {
            return Promise.resolve(roautotradeUserPrefsResolved.get(key));
        }
        if (roautotradeUserPrefsInflight.has(key)) {
            return roautotradeUserPrefsInflight.get(key);
        }
        const p = new Promise(function (resolve, reject) {
            try {
                chrome.runtime.sendMessage(
                    {
                        action: 'fetchRolautotradeUserPreferences',
                        userId: userId,
                    },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        if (response && response.success && response.data) {
                            resolve(response.data);
                        } else {
                            reject(
                                new Error(
                                    (response && response.error) || 'roautotrade_user_prefs_failed'
                                )
                            );
                        }
                    }
                );
            } catch (err) {
                reject(err);
            }
        });
        roautotradeUserPrefsInflight.set(key, p);
        p.then(function (data) {
            roautotradeUserPrefsResolved.set(key, data);
            roautotradeUserPrefsInflight.delete(key);
        }).catch(function () {
            roautotradeUserPrefsInflight.delete(key);
        });
        return p;
    }
    function removePartnerInventoryLabels(detail) {
        if (!detail) {
            return;
        }
        detail.querySelectorAll('.rotrade-partner-inv-block').forEach(function (el) {
            el.remove();
        });
    }
    function buildPayload() {
        const detail = document.querySelector('.trades-list-detail');
        if (!detail) {
            return null;
        }
        const partnerLink = findPartnerUserLink(detail);
        if (!partnerLink) {
            return null;
        }
        const href = partnerLink.getAttribute('href') || partnerLink.getAttribute('ng-href') || '';
        const userMatch = href.match(/\/users\/(\d+)\b/);
        const userId = userMatch ? userMatch[1] : null;
        let username = extractPartnerUsername(partnerLink);
        if (!username) {
            username = undefined;
        }
        const given = [];
        const received = [];
        const unknown = [];
        const offerBlocks = detail.querySelectorAll('.trade-list-detail-offer');
        offerBlocks.forEach((offer) => {
            const h3 = offer.querySelector('h3.trade-list-detail-offer-header');
            const headerText = h3 ? h3.textContent.trim() : '';
            const bucket = classifyOfferHeader(headerText);
            const cards = offer.querySelectorAll('li.trade-item-card');
            cards.forEach((card) => {
                const pair = resolveItemIdPair(card);
                if (!pair) {
                    return;
                }
                const name = extractItemNameFromCard(card) || undefined;
                const entry = {
                    itemId: pair.itemId,
                    name: name,
                };
                if (bucket === 'given') {
                    given.push(entry);
                } else if (bucket === 'received') {
                    received.push(entry);
                } else {
                    unknown.push(
                        Object.assign({}, entry, {
                            headerHint: headerText || undefined,
                        })
                    );
                }
            });
        });
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (!userId) {
            return null;
        }
        if (given.length === 0 && received.length === 0 && unknown.length === 0) {
            return null;
        }
        return {
            tab: tab,
            partner: {
                userId: userId,
                username: username,
            },
            given: given,
            received: received,
            unknown: unknown.length ? unknown : undefined,
        };
    }
    function run() {
        if (!shouldRun()) {
            lastSerialized = '';
            const d = document.querySelector('.trades-list-detail');
            if (d) {
                removePartnerInventoryLabels(d);
                removeTradeDetailUsdRows(d);
            }
            return;
        }
        const payload = buildPayload();
        if (!payload) {
            const d = document.querySelector('.trades-list-detail');
            if (d) {
                removePartnerInventoryLabels(d);
                removeTradeDetailUsdRows(d);
            }
            return;
        }
        const serialized = JSON.stringify(payload);
        if (serialized !== lastSerialized) {
            lastSerialized = serialized;
        }
        const seq = ++usdInjectSeq;
        Promise.all([getRolimonItemsRaw(), window.TradeDetailRobuxUsd.loadSettings()]).then(
            function (results) {
                const items = results[0];
                const usd = results[1] || {};
                const per1k = typeof usd.per1k === 'number' ? usd.per1k : 4;
                const usdEnabled = usd.enabled !== false;
                const showWinLoss = usd.showTradeSummaryWinLoss !== false;
                if (seq !== usdInjectSeq) {
                    return;
                }
                const detailEl = document.querySelector('.trades-list-detail');
                if (!detailEl || !shouldRun()) {
                    return;
                }
                withSuppressedObserverSchedule(function () {
                    injectSyntheticRolimonsValueRowsForTradeDetail(detailEl, items, seq);
                    if (usdEnabled) {
                        injectUsdRowsForTradeDetail(detailEl, items, seq, per1k);
                    } else {
                        removeUsdRowsFromRoot(detailEl);
                    }
                    injectOfferTotalsRowsForTradeDetail(detailEl, items, seq, per1k, usdEnabled);
                    injectTradeSummaryBetweenOffers(
                        detailEl,
                        items,
                        seq,
                        per1k,
                        showWinLoss,
                        usdEnabled
                    );
                });
            }
        );
    }
    function schedule() {
        if (!window.TradeDetailPath.isTradesPage()) {
            return;
        }
        if (suppressObserverSchedule) {
            return;
        }
        attachDetailObserver();
        attachTradesContainerObserver();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            debounceTimer = null;
            run();
        }, DEBOUNCE_MS);
    }
    function disconnectDetailObserver() {
        if (detailObserver) {
            detailObserver.disconnect();
            detailObserver = null;
            observedDetailEl = null;
        }
    }
    function disconnectTradesContainerObserver() {
        if (tradesContainerObserver) {
            tradesContainerObserver.disconnect();
            tradesContainerObserver = null;
            observedTradesContainerEl = null;
        }
    }
    function attachTradesContainerObserver() {
        if (!window.TradeDetailPath.isTradesPage() || isSendTradeMode()) {
            disconnectTradesContainerObserver();
            return;
        }
        const tc = document.querySelector('.trades-container');
        if (!tc) {
            disconnectTradesContainerObserver();
            return;
        }
        if (observedTradesContainerEl === tc) {
            return;
        }
        disconnectTradesContainerObserver();
        observedTradesContainerEl = tc;
        tradesContainerObserver = new MutationObserver(function (mutations) {
            if (suppressObserverSchedule) {
                return;
            }
            for (let i = 0; i < mutations.length; i++) {
                const m = mutations[i];
                if (m.type !== 'childList' || !m.addedNodes || m.addedNodes.length === 0) {
                    continue;
                }
                for (let j = 0; j < m.addedNodes.length; j++) {
                    const n = m.addedNodes[j];
                    if (n.nodeType !== 1) {
                        continue;
                    }
                    if (n.classList && n.classList.contains('trade-item-card')) {
                        schedule();
                        return;
                    }
                    if (n.querySelector && n.querySelector('.trade-item-card')) {
                        schedule();
                        return;
                    }
                }
            }
        });
        tradesContainerObserver.observe(tc, {
            childList: true,
            subtree: true,
        });
    }
    function attachDetailObserver() {
        if (!window.TradeDetailPath.isTradesPage() || isSendTradeMode()) {
            disconnectDetailObserver();
            return;
        }
        const detail = document.querySelector('.trades-list-detail');
        if (!detail) {
            disconnectDetailObserver();
            return;
        }
        if (observedDetailEl === detail) {
            return;
        }
        disconnectDetailObserver();
        observedDetailEl = detail;
        detailObserver = new MutationObserver(function () {
            if (suppressObserverSchedule) {
                return;
            }
            schedule();
        });
        detailObserver.observe(detail, {
            childList: true,
            subtree: true,
        });
    }
    function disconnectObserver() {
        disconnectDetailObserver();
        disconnectTradesContainerObserver();
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }
    function onTradeUiInteraction() {
        if (!window.TradeDetailPath.isTradesPage() || isSendTradeMode()) {
            return;
        }
        attachDetailObserver();
        attachTradesContainerObserver();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            debounceTimer = null;
            requestAnimationFrame(function () {
                requestAnimationFrame(run);
            });
        }, 0);
    }
    function scheduleCatalogAugmentation() {
        if (
            !window.TradeDetailPath.isCatalogBrowsePage() &&
            !window.TradeDetailPath.isMarketplaceItemDetailPage()
        ) {
            return;
        }
        clearTimeout(catalogDebounceTimer);
        catalogDebounceTimer = setTimeout(function () {
            catalogDebounceTimer = null;
            if (window.TradeDetailPath.isCatalogBrowsePage()) {
                runCatalogAugmentation();
            }
            if (window.TradeDetailPath.isMarketplaceItemDetailPage()) {
                runCatalogItemDetailAugmentation();
            }
        }, DEBOUNCE_MS);
    }
    function decorateCatalogBrowseBadges(root, items) {
        if (!root || !window.ProjectedFlag || !window.ProjectedFlag.decorateThumbContainer) {
            return;
        }
        const cards = root.querySelectorAll('.catalog-item-container');
        cards.forEach(function (card) {
            const thumbContainer = card.querySelector('.item-card-thumb-container');
            if (!thumbContainer) {
                return;
            }
            const pair = resolveItemIdPair(card);
            const itemId = pair ? pair.itemId : null;
            window.ProjectedFlag.decorateThumbContainer(thumbContainer, itemId, items);
        });
    }
    function decorateCatalogItemDetailBadges(items) {
        if (!window.ProjectedFlag || !window.ProjectedFlag.decorateThumbContainer) {
            return;
        }
        const detailPair = window.TradeDetailPath.resolveMarketplaceItemDetailPair();
        if (!detailPair) {
            return;
        }
        const thumbContainer =
            document.querySelector('#item-thumbnail-container-frontend') ||
            document.querySelector('#item-details .item-card-thumb-container') ||
            document.querySelector('.item-thumbnail-container');
        if (!thumbContainer) {
            return;
        }
        window.ProjectedFlag.decorateThumbContainer(thumbContainer, detailPair.itemId, items);
    }
    function decorateCatalogItemTitleLink() {
        const detailPair = window.TradeDetailPath.resolveMarketplaceItemDetailPair();
        if (!detailPair || !detailPair.itemId) {
            return;
        }
        const container = document.querySelector('.item-name-container');
        if (!container) {
            return;
        }
        const heading = container.querySelector('h1');
        if (!heading) {
            return;
        }
        if (heading.querySelector(':scope > .rotrade-rolimons-title-link')) {
            return;
        }
        const link = document.createElement('a');
        link.className = 'rotrade-rolimons-title-link';
        link.href =
            'https://www.rolimons.com/item/' + encodeURIComponent(detailPair.itemId);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = "Open on Rolimon's";
        link.setAttribute('aria-label', "Open on Rolimon's");
        link.style.cssText =
            'display:inline-flex;align-items:center;margin-left:10px;vertical-align:middle;cursor:pointer;text-decoration:none;transition:transform 0.15s ease;';
        link.addEventListener('mouseenter', function () {
            link.style.transform = 'scale(1.1)';
        });
        link.addEventListener('mouseleave', function () {
            link.style.transform = '';
        });
        link.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        const img = document.createElement('img');
        const isDark =
            (document.body && document.body.classList.contains('dark-theme')) ||
            (document.documentElement &&
                document.documentElement.classList.contains('dark-theme'));
        img.src = chrome.runtime.getURL(
            isDark ? 'assets/rolimonsLink.svg' : 'assets/rolimonsLinkDark.svg'
        );
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        img.style.cssText = 'width:24px;height:24px;display:block;pointer-events:none;';
        link.appendChild(img);
        heading.style.overflow = 'visible';
        heading.appendChild(link);
    }
    function runCatalogItemDetailAugmentation() {
        if (!window.TradeDetailPath.isMarketplaceItemDetailPage()) {
            return;
        }
        const root = document.querySelector('#item-details') || document.body;
        const seq = ++catalogAugmentSeq;
        Promise.all([getRolimonItemsRaw(), window.TradeDetailRobuxUsd.loadSettings()]).then(
            function (results) {
                const items = results[0];
                const usd = results[1] || {};
                const per1k = typeof usd.per1k === 'number' ? usd.per1k : 4;
                const usdEnabled = usd.enabled !== false;
                if (
                    seq !== catalogAugmentSeq ||
                    !window.TradeDetailPath.isMarketplaceItemDetailPage()
                ) {
                    return;
                }
                injectSyntheticRolimonsRowsInRoot(root, items);
                if (usdEnabled) {
                    injectUsdRowsInRoot(root, items, per1k);
                    injectCatalogResellerResaleUsdRows(per1k);
                } else {
                    removeUsdRowsFromRoot(root);
                    removeCatalogResellerUsdRows();
                }
                decorateCatalogItemDetailBadges(items);
                decorateCatalogItemTitleLink();
            }
        );
    }
    function runCatalogAugmentation() {
        if (!window.TradeDetailPath.isCatalogBrowsePage()) {
            return;
        }
        const root =
            document.querySelector('#react-items-container') ||
            document.querySelector('.catalog-results') ||
            document.querySelector('#results.results-container');
        if (!root) {
            return;
        }
        const seq = ++catalogAugmentSeq;
        Promise.all([getRolimonItemsRaw(), window.TradeDetailRobuxUsd.loadSettings()]).then(
            function (results) {
                const items = results[0];
                const usd = results[1] || {};
                const per1k = typeof usd.per1k === 'number' ? usd.per1k : 4;
                const usdEnabled = usd.enabled !== false;
                if (seq !== catalogAugmentSeq || !window.TradeDetailPath.isCatalogBrowsePage()) {
                    return;
                }
                injectSyntheticRolimonsRowsInRoot(root, items);
                if (usdEnabled) {
                    injectUsdRowsInRoot(root, items, per1k);
                } else {
                    removeUsdRowsFromRoot(root);
                }
                decorateCatalogBrowseBadges(root, items);
            }
        );
    }
    function init() {
        if (window.__rotradeTradeDetailContextInit) {
            return;
        }
        window.__rotradeTradeDetailContextInit = true;
        if (
            typeof chrome !== 'undefined' &&
            chrome.storage &&
            typeof chrome.storage.onChanged !== 'undefined'
        ) {
            try {
                chrome.storage.onChanged.addListener(function (changes, areaName) {
                    if (areaName !== 'local' || !changes.rotradeSettings) {
                        return;
                    }
                    window.TradeDetailRobuxUsd.invalidateCache();
                    schedule();
                    scheduleCatalogAugmentation();
                });
            } catch {}
        }
        window.addEventListener('hashchange', function () {
            schedule();
            scheduleCatalogAugmentation();
        });
        window.addEventListener('popstate', function () {
            schedule();
            scheduleCatalogAugmentation();
        });
        document.addEventListener(
            'click',
            function (e) {
                if (!e.target || !e.target.closest) {
                    return;
                }
                if (e.target.closest('.trade-row')) {
                    document
                        .querySelectorAll('.trades-list-detail [data-rotrade-trade-summary]')
                        .forEach(function (el) {
                            el.remove();
                        });
                    document
                        .querySelectorAll('.trades-list-detail [data-rotrade-offer-totals]')
                        .forEach(function (el) {
                            const prev = el.previousSibling;
                            if (prev && prev.nodeType === 1 && prev.tagName === 'BR') {
                                prev.remove();
                            }
                            el.remove();
                        });
                }
                if (
                    e.target.closest('.trade-row') ||
                    e.target.closest('.trades-list-detail') ||
                    e.target.closest('[trades-list]')
                ) {
                    onTradeUiInteraction();
                }
            },
            true
        );
        observer = new MutationObserver(function () {
            if (suppressObserverSchedule) {
                return;
            }
            attachDetailObserver();
            attachTradesContainerObserver();
            schedule();
            scheduleCatalogAugmentation();
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
        attachDetailObserver();
        attachTradesContainerObserver();
        schedule();
        scheduleCatalogAugmentation();
        if (window.Utils && typeof window.Utils.delay === 'function') {
            window.Utils.delay(400).then(function () {
                attachDetailObserver();
                attachTradesContainerObserver();
                schedule();
                scheduleCatalogAugmentation();
            });
        }
    }
    window.TradeDetailContext = {
        init: init,
        disconnectObserver: disconnectObserver,
        _scheduleForTests: schedule,
    };
    window.TradeDetailItemIds = {
        extractItemIdFromCard: extractItemIdFromCard,
        collectItemIdCandidates: collectItemIdCandidates,
        resolveItemIdPair: resolveItemIdPair,
        getRolautotradeUserStats: getRolautotradeUserStats,
        getRolautotradeUserPreferences: getRolautotradeUserPreferences,
        findPartnerUserLink: findPartnerUserLink,
        injectTradeRequestInventoryUsd: injectTradeRequestInventoryUsd,
        removeTradeRequestInventoryUsd: removeTradeRequestInventoryUsd,
        getRolimonItemsRaw: getRolimonItemsRaw,
        lookupRolimonArrayForTradeItem: lookupRolimonArrayForTradeItem,
        augmentCatalogGrid: runCatalogAugmentation,
        augmentCatalogItemDetail: runCatalogItemDetailAugmentation,
    };
})();
