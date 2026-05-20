(function () {
    'use strict';

    const BRIDGE_PATH = 'assets/trade-row-id-bridge.js';
    const PROCESS_DEBOUNCE_MS = 120;
    const MAX_TRADE_DETAIL_ATTEMPTS = 3;
    const TRADE_DETAILS_STORAGE_KEY = 'rotradeTradeDetails';
    const TRADE_DETAILS_TTL_MS = 24 * 60 * 60 * 1000;
    const TRADE_DETAILS_MAX_ENTRIES = 500;
    const PERSIST_DEBOUNCE_MS = 600;

    let bridgeInjected = false;
    let processTimer = null;
    let persistTimer = null;
    let rolimonsItemsPromise = null;
    const tradeDetailData = new Map();
    const tradeDetailTs = new Map();
    const tradeDetailPending = new Set();
    const tradeDetailAttempts = new Map();

    let enabledCache = true;
    function setEnabledFromSettings(s) {
        enabledCache = !s || s.tradeListValueBoxEnabled !== false;
    }
    function valueBoxEnabled() {
        return enabledCache;
    }
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['rotradeSettings'], function (r) {
                setEnabledFromSettings(r && r.rotradeSettings);
                if (!enabledCache) {
                    removeAllValueBoxes();
                }
            });
        }
    } catch {}

    function onTradesPage() {
        try {
            const path = window.location.pathname;
            if (window.Routing && typeof window.Routing.normalizePath === 'function') {
                return window.Routing.normalizePath(path) === '/trades';
            }
            return /\/trades(\/|$)/.test(path);
        } catch {
            return false;
        }
    }

    function commafy(n) {
        const v = Math.round(Number(n) || 0);
        try {
            return v.toLocaleString('en-US');
        } catch {
            return String(v);
        }
    }

    function valueOrRap(arr) {
        if (!Array.isArray(arr)) {
            return 0;
        }
        const value = Number(arr[4]);
        if (isFinite(value) && value > 0) {
            return value;
        }
        const rap = Number(arr[2]);
        if (isFinite(rap) && rap > 0) {
            return rap;
        }
        return 0;
    }

    function offerTotal(offer, items) {
        if (!offer) {
            return 0;
        }
        let total = 0;
        const assets =
            (Array.isArray(offer.items) && offer.items) ||
            (Array.isArray(offer.userAssets) && offer.userAssets) ||
            (Array.isArray(offer.assets) && offer.assets) ||
            (Array.isArray(offer.userAssetIds) && offer.userAssetIds) ||
            [];
        for (let i = 0; i < assets.length; i++) {
            const ua = assets[i];
            let id = null;
            let inlineRap = 0;
            if (typeof ua === 'number' || typeof ua === 'string') {
                id = ua;
            } else if (ua && typeof ua === 'object') {
                if (ua.itemTarget && ua.itemTarget.targetId != null) {
                    id = ua.itemTarget.targetId;
                } else if (ua.assetId != null) {
                    id = ua.assetId;
                } else if (ua.id != null) {
                    id = ua.id;
                }
                const rap = Number(ua.recentAveragePrice);
                if (isFinite(rap) && rap > 0) {
                    inlineRap = rap;
                }
            }
            let v = 0;
            if (id != null && items) {
                const aliases = window.TradeItemIdAliases;
                const canonical =
                    aliases && typeof aliases.normalizeTradeItemId === 'function'
                        ? aliases.normalizeTradeItemId(id)
                        : null;
                if (canonical != null) {
                    v = valueOrRap(items[canonical] || items[String(canonical)]);
                }
                if (v === 0) {
                    v = valueOrRap(items[id] || items[String(id)]);
                }
            }
            if (v === 0 && inlineRap > 0) {
                v = inlineRap;
            }
            total += v;
        }
        const robuxRaw = offer.robux != null ? offer.robux : offer.robuxAmount;
        const robux = Number(robuxRaw);
        if (isFinite(robux) && robux > 0) {
            total += robux;
        }
        return total;
    }

    function normalizeTradeOffers(data) {
        if (!data || typeof data !== 'object') {
            return null;
        }
        if (Array.isArray(data.offers) && data.offers.length >= 2) {
            return [data.offers[0], data.offers[1]];
        }
        if (data.participantAOffer && data.participantBOffer) {
            return [data.participantAOffer, data.participantBOffer];
        }
        return null;
    }

    function getRolimonsItems() {
        if (rolimonsItemsPromise) {
            return rolimonsItemsPromise;
        }
        rolimonsItemsPromise = new Promise(function (resolve) {
            try {
                chrome.runtime.sendMessage({ action: 'fetchRolimons' }, function (response) {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        rolimonsItemsPromise = null;
                        resolve({});
                        return;
                    }
                    resolve((response.data && response.data.items) || {});
                });
            } catch {
                rolimonsItemsPromise = null;
                resolve({});
            }
        });
        return rolimonsItemsPromise;
    }

    function ensureTradeDetail(tradeId) {
        if (tradeDetailData.has(tradeId) || tradeDetailPending.has(tradeId)) {
            return;
        }
        if ((tradeDetailAttempts.get(tradeId) || 0) >= MAX_TRADE_DETAIL_ATTEMPTS) {
            return;
        }
        tradeDetailPending.add(tradeId);
        fetch('https://trades.roblox.com/v2/trades/' + encodeURIComponent(tradeId), {
            credentials: 'include',
        })
            .then(function (res) {
                return res && res.ok ? res.json() : null;
            })
            .catch(function () {
                return null;
            })
            .then(function (data) {
                tradeDetailPending.delete(tradeId);
                const offers = normalizeTradeOffers(data);
                if (offers) {
                    tradeDetailData.set(tradeId, { offers: offers });
                    tradeDetailTs.set(tradeId, Date.now());
                    schedulePersist();
                    scheduleProcess();
                } else {
                    tradeDetailAttempts.set(tradeId, (tradeDetailAttempts.get(tradeId) || 0) + 1);
                }
            });
    }

    function schedulePersist() {
        clearTimeout(persistTimer);
        persistTimer = setTimeout(persistTradeDetails, PERSIST_DEBOUNCE_MS);
    }

    function persistTradeDetails() {
        try {
            const out = {};
            const ids = Array.from(tradeDetailData.keys());
            const sorted = ids.sort(function (a, b) {
                return (tradeDetailTs.get(b) || 0) - (tradeDetailTs.get(a) || 0);
            });
            const keep = sorted.slice(0, TRADE_DETAILS_MAX_ENTRIES);
            keep.forEach(function (id) {
                out[id] = {
                    data: tradeDetailData.get(id),
                    ts: tradeDetailTs.get(id) || Date.now(),
                };
            });
            chrome.storage.local.set({ [TRADE_DETAILS_STORAGE_KEY]: out }).catch(function () {});
        } catch {}
    }

    async function loadPersistedTradeDetails() {
        try {
            const r = await chrome.storage.local.get([TRADE_DETAILS_STORAGE_KEY]);
            const stored = r && r[TRADE_DETAILS_STORAGE_KEY];
            if (!stored || typeof stored !== 'object') return;
            const cutoff = Date.now() - TRADE_DETAILS_TTL_MS;
            Object.keys(stored).forEach(function (id) {
                const entry = stored[id];
                if (
                    entry &&
                    typeof entry === 'object' &&
                    entry.ts > cutoff &&
                    entry.data &&
                    Array.isArray(entry.data.offers) &&
                    entry.data.offers.length >= 2
                ) {
                    tradeDetailData.set(id, entry.data);
                    tradeDetailTs.set(id, entry.ts);
                }
            });
        } catch {}
    }

    function buildValueBoxHtml(yourTotal, theirTotal) {
        const glowColor =
            yourTotal === theirTotal
                ? 'rgb(79, 81, 82)'
                : yourTotal > theirTotal
                  ? '#d72020'
                  : '#20d742';
        return (
            '<div class="tradeListValuesBox" style="height: 60%;padding:2px;z-index: 0;border-top-left-radius: 7px;overflow: visible;position: absolute; bottom: 0;right:0;">' +
            '<div class="glowBar" style="margin-top:2%;margin-left:3%;height: 90%;width: 15px;float: left;background-color: ' +
            glowColor +
            ';border-top-left-radius: 7px;"></div>' +
            '<div class="rapElement" style="font-family: HCo Gotham SSm, Helvetica Neue, Helvetica, Arial, Lucida Grande,sans-serif; font-weight: bold; font-size: 15px; line-height: 1.5; color: rgb(255, 255, 255); z-index: 1001;margin-left: 25px;padding-right:3px;">' +
            '<span class="amount-1 text-robux">' +
            commafy(yourTotal) +
            '</span>' +
            '<br>' +
            "<hr style='float: right;width:80%; background-color: black; opacity: 0.2; height: 2px; border: 0px;margin:0px;'>" +
            '<span class="amount-2 text-robux">' +
            commafy(theirTotal) +
            '</span>' +
            '</div>' +
            '</div>'
        );
    }

    function pickBoxTarget(row) {
        const candidates = [
            '.trade-row-details',
            '.trade-row-container',
            '.trade-row-content',
            '.trade-row-inner',
        ];
        for (let i = 0; i < candidates.length; i++) {
            const el = row.querySelector(candidates[i]);
            if (el) return el;
        }
        return row;
    }

    function injectValueBox(row, tradeId, yourTotal, theirTotal) {
        const existing = row.querySelector('.tradeListValuesBox');
        if (existing) {
            existing.remove();
        }
        const target = pickBoxTarget(row);
        try {
            const cs = window.getComputedStyle(target);
            if (cs && cs.position === 'static') {
                target.style.position = 'relative';
            }
        } catch {}
        target.insertAdjacentHTML('beforeend', buildValueBoxHtml(yourTotal, theirTotal));
        row.__rotradeValueBoxTradeId = String(tradeId);
    }

    function removeAllValueBoxes() {
        document.querySelectorAll('.tradeListValuesBox').forEach(function (el) {
            el.remove();
        });
        document.querySelectorAll('.trade-row').forEach(function (row) {
            delete row.__rotradeValueBoxTradeId;
        });
    }

    async function processRows() {
        if (!onTradesPage() || !valueBoxEnabled()) {
            removeAllValueBoxes();
            return;
        }
        const items = await getRolimonsItems();
        if (!onTradesPage() || !valueBoxEnabled()) {
            removeAllValueBoxes();
            return;
        }
        if (!items || Object.keys(items).length === 0) {
            return;
        }
        const rows = document.querySelectorAll('.trade-row[data-rotrade-trade-id]');
        rows.forEach(function (row) {
            const tradeId = row.getAttribute('data-rotrade-trade-id');
            if (!tradeId) {
                return;
            }
            if (
                row.querySelector('.tradeListValuesBox') &&
                row.__rotradeValueBoxTradeId === tradeId
            ) {
                return;
            }
            const data = tradeDetailData.get(tradeId);
            if (!data) {
                ensureTradeDetail(tradeId);
                return;
            }
            injectValueBox(
                row,
                tradeId,
                offerTotal(data.offers[0], items),
                offerTotal(data.offers[1], items)
            );
        });
    }

    function scheduleProcess() {
        clearTimeout(processTimer);
        processTimer = setTimeout(function () {
            processTimer = null;
            processRows();
        }, PROCESS_DEBOUNCE_MS);
    }

    function requestTagRows() {
        try {
            document.dispatchEvent(new CustomEvent('rotrade:tagTradeRows'));
        } catch {}
    }

    function onRowsTagged() {
        scheduleProcess();
    }

    function ensureBridge() {
        if (bridgeInjected) {
            return;
        }
        bridgeInjected = true;
        try {
            document.addEventListener('rotrade:tradeRowsTagged', onRowsTagged);
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(BRIDGE_PATH);
            script.onload = function () {
                script.remove();
                requestTagRows();
            };
            (document.head || document.documentElement).appendChild(script);
        } catch {
            bridgeInjected = false;
        }
    }

    function refresh() {
        if (!onTradesPage()) {
            return;
        }
        if (!valueBoxEnabled()) {
            removeAllValueBoxes();
            return;
        }
        ensureBridge();
        requestTagRows();
        scheduleProcess();
    }

    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener(function (changes, areaName) {
                if (areaName !== 'local' || !changes || !changes.rotradeSettings) {
                    return;
                }
                const next = changes.rotradeSettings.newValue;
                setEnabledFromSettings(next);
                if (enabledCache) {
                    refresh();
                } else {
                    removeAllValueBoxes();
                }
            });
        }
    } catch {}

    function selfInit() {
        try {
            if (window.Scheduler && typeof window.Scheduler.onBodyMutation === 'function') {
                window.Scheduler.onBodyMutation(refresh);
            }
        } catch {}
        loadPersistedTradeDetails().finally(function () {
            refresh();
            setTimeout(refresh, 700);
            setTimeout(refresh, 1800);
            setTimeout(refresh, 4000);
        });
    }

    window.TradeListValues = {
        refresh: refresh,
        removeAll: removeAllValueBoxes,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', selfInit);
    } else {
        selfInit();
    }
})();
