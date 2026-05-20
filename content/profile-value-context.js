(function () {
    'use strict';
    const VALUE_ATTR = 'data-rotrade-profile-value-link';
    let observer = null;
    let rafId = 0;
    let rolimonItemsCache = null;
    let rolimonItemsPromise = null;
    const valueByUserId = new Map();
    const rapByUserId = new Map();
    const inflightByUserId = new Map();
    function parseProfileUserId() {
        const p = (window.location.pathname || '').replace(/^\/([a-z]{2})\//, '/');
        const m = p.match(/^\/users\/(\d+)\/profile\/?$/);
        return m ? m[1] : null;
    }
    function countCopiesInScannedAssetEntry(entry) {
        if (!Array.isArray(entry)) {
            return 0;
        }
        let n = 0;
        for (let i = 0; i < entry.length; i++) {
            const group = entry[i];
            if (!Array.isArray(group)) {
                continue;
            }
            for (let j = 0; j < group.length; j++) {
                const row = group[j];
                if (row && typeof row === 'object' && row.uaid != null) {
                    n++;
                }
            }
        }
        return n;
    }
    function totalMetricFromScannedPlayerAssets(scanned, rolimonData, metricIndex) {
        let total = 0;
        if (!scanned || typeof scanned !== 'object' || !rolimonData) {
            return 0;
        }
        const normalizeAssetId =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return x == null || x === '' ? null : String(x).trim();
                  };
        for (const assetId of Object.keys(scanned)) {
            const count = countCopiesInScannedAssetEntry(scanned[assetId]);
            if (count === 0) {
                continue;
            }
            const canonical = normalizeAssetId(assetId) || String(assetId);
            const rolimonItem =
                rolimonData[canonical] ||
                rolimonData[String(canonical)] ||
                rolimonData[Number(canonical)] ||
                rolimonData[assetId] ||
                rolimonData[String(assetId)] ||
                rolimonData[Number(assetId)];
            if (rolimonItem && Array.isArray(rolimonItem) && rolimonItem.length > metricIndex) {
                total += (Number(rolimonItem[metricIndex]) || 0) * count;
            }
        }
        return Math.round(total);
    }
    function totalValueFromScannedPlayerAssets(scanned, rolimonData) {
        return totalMetricFromScannedPlayerAssets(scanned, rolimonData, 4);
    }
    function totalRapFromScannedPlayerAssets(scanned, rolimonData) {
        return totalMetricFromScannedPlayerAssets(scanned, rolimonData, 2);
    }
    let currentMetric = 'value';
    let metricInitialized = false;
    function refreshMetricFromStorage() {
        try {
            chrome.storage.local.get(['rotradeSettings'], function (r) {
                if (chrome.runtime.lastError) {
                    metricInitialized = true;
                    return;
                }
                const s = (r && r.rotradeSettings) || {};
                const next = s.profileMetric === 'rap' ? 'rap' : 'value';
                const changed = next !== currentMetric;
                currentMetric = next;
                metricInitialized = true;
                if (changed) {
                    const row = findTargetRow();
                    if (row) {
                        const a = row.querySelector('a[' + VALUE_ATTR + '="1"]');
                        if (a) a.remove();
                    }
                    scheduleRender();
                }
            });
        } catch {
            metricInitialized = true;
        }
    }
    function formatCompactInventoryValue(num) {
        const n = Math.round(Number(num));
        if (!isFinite(n)) {
            return '—';
        }
        if (n < 1e3) {
            return String(n);
        }
        if (n < 1e6) {
            const k = n / 1e3;
            return (k >= 100 ? Math.round(k) : Math.round(k * 10) / 10) + 'K';
        }
        if (n < 1e9) {
            const m = n / 1e6;
            return (m >= 100 ? Math.round(m) : Math.round(m * 10) / 10) + 'M';
        }
        const b = n / 1e9;
        return (b >= 100 ? Math.round(b) : Math.round(b * 10) / 10) + 'B';
    }
    function getRolimonItemsRaw() {
        if (rolimonItemsCache) {
            return Promise.resolve(rolimonItemsCache);
        }
        if (rolimonItemsPromise) {
            return rolimonItemsPromise;
        }
        rolimonItemsPromise = new Promise(function (resolve, reject) {
            try {
                chrome.runtime.sendMessage(
                    {
                        action: 'fetchRolimons',
                    },
                    function (response) {
                        if (chrome.runtime.lastError || !response || !response.success) {
                            rolimonItemsPromise = null;
                            reject(new Error('rolimons_fetch_failed'));
                            return;
                        }
                        const items = (response.data && response.data.items) || {};
                        rolimonItemsCache = items;
                        rolimonItemsPromise = null;
                        resolve(items);
                    }
                );
            } catch (err) {
                rolimonItemsPromise = null;
                reject(err);
            }
        });
        return rolimonItemsPromise;
    }
    function getUserStats(userId) {
        if (inflightByUserId.has(userId)) {
            return inflightByUserId.get(userId);
        }
        const p = new Promise(function (resolve, reject) {
            try {
                chrome.runtime.sendMessage(
                    {
                        action: 'fetchRolautotradeUserStats',
                        userId: userId,
                    },
                    function (response) {
                        if (
                            chrome.runtime.lastError ||
                            !response ||
                            !response.success ||
                            !response.data
                        ) {
                            reject(new Error('user_stats_fetch_failed'));
                            return;
                        }
                        resolve(response.data);
                    }
                );
            } catch (err) {
                reject(err);
            }
        }).finally(function () {
            inflightByUserId.delete(userId);
        });
        inflightByUserId.set(userId, p);
        return p;
    }
    function findTargetRow() {
        const userId = parseProfileUserId();
        if (!userId) {
            return null;
        }
        const allRows = document.querySelectorAll('div.flex-nowrap.gap-small.flex');
        for (let i = 0; i < allRows.length; i++) {
            const row = allRows[i];
            const links = row.querySelectorAll('a');
            if (links.length < 2) {
                continue;
            }
            let score = 0;
            for (let j = 0; j < links.length; j++) {
                const a = links[j];
                const href = (a.getAttribute('href') || '').toLowerCase();
                const txt = (a.textContent || '').toLowerCase();
                if (
                    href.indexOf('/friends#!/friends') !== -1 ||
                    href.indexOf('/friends#!/followers') !== -1 ||
                    href.indexOf('/friends#!/following') !== -1
                ) {
                    score++;
                    continue;
                }
                if (
                    txt.indexOf('connection') !== -1 ||
                    txt.indexOf('follower') !== -1 ||
                    txt.indexOf('following') !== -1
                ) {
                    score++;
                }
            }
            if (score >= 2) {
                return row;
            }
        }
        return null;
    }
    function ensureValueLink(row, userId, text, isLoading) {
        if (!row) {
            return null;
        }
        let a = row.querySelector('a[' + VALUE_ATTR + '="1"]');
        if (!a) {
            const sample = row.querySelector('a.content-action-utility') || row.querySelector('a');
            a = document.createElement('a');
            a.setAttribute(VALUE_ATTR, '1');
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.style.textDecoration = 'none';
            a.href = 'https://www.rolimons.com/player/' + encodeURIComponent(userId);
            if (sample) {
                a.className = sample.className;
            } else {
                a.className = 'content-action-utility';
            }
            const overlay = document.createElement('div');
            overlay.setAttribute('role', 'presentation');
            overlay.className =
                'absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none';
            const span = document.createElement('span');
            span.className = 'padding-y-xsmall text-no-wrap text-truncate-end';
            a.appendChild(overlay);
            a.appendChild(span);
            row.appendChild(a);
        }
        const span = a.querySelector('span');
        if (span) {
            span.textContent = text;
        }
        a.href = 'https://www.rolimons.com/player/' + encodeURIComponent(userId);
        a.setAttribute('aria-disabled', isLoading ? 'true' : 'false');
        if (isLoading) {
            a.classList.add('opacity-[0.5]');
        } else {
            a.classList.remove('opacity-[0.5]');
        }
        return a;
    }
    const privateByUserId = new Set();
    const failedByUserId = new Set();
    function render() {
        if (!metricInitialized) {
            return;
        }
        const userId = parseProfileUserId();
        if (!userId) {
            return;
        }
        const row = findTargetRow();
        if (!row) {
            return;
        }
        const metric = currentMetric;
        const label = metric === 'rap' ? 'RAP' : 'Value';
        const cacheMap = metric === 'rap' ? rapByUserId : valueByUserId;
        const cached = cacheMap.get(userId);
        if (cached != null) {
            const a = ensureValueLink(
                row,
                userId,
                formatCompactInventoryValue(cached) + ' ' + label,
                false
            );
            if (a) {
                a.removeAttribute('title');
                a.removeAttribute('aria-label');
            }
            return;
        }
        if (privateByUserId.has(userId)) {
            const a = ensureValueLink(row, userId, 'Private', false);
            if (a) {
                const msg =
                    "This user's inventory is private so " +
                    label.toLowerCase() +
                    ' cannot be detected.';
                a.setAttribute('title', msg);
                a.setAttribute('aria-label', msg);
            }
            return;
        }
        if (failedByUserId.has(userId)) {
            ensureValueLink(row, userId, '0 ' + label, true);
            return;
        }
        if (inflightByUserId.has(userId)) {
            if (!row.querySelector('a[' + VALUE_ATTR + '="1"]')) {
                ensureValueLink(row, userId, '0 ' + label, true);
            }
            return;
        }
        ensureValueLink(row, userId, '0 ' + label, true);
        Promise.all([getUserStats(userId), getRolimonItemsRaw()])
            .then(function (results) {
                const stats = results[0];
                const items = results[1];
                const scanned = stats && stats.scanned_player_assets;
                const hasScanData =
                    scanned && typeof scanned === 'object' && Object.keys(scanned).length > 0;
                if (!hasScanData) {
                    privateByUserId.add(userId);
                    scheduleRender();
                    return;
                }
                const value = totalValueFromScannedPlayerAssets(scanned, items);
                const rap = totalRapFromScannedPlayerAssets(scanned, items);
                valueByUserId.set(userId, value);
                rapByUserId.set(userId, rap);
                scheduleRender();
            })
            .catch(function () {
                failedByUserId.add(userId);
                scheduleRender();
            });
    }
    function scheduleRender() {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(function () {
            rafId = 0;
            render();
        });
    }
    function init() {
        if (window.__rotradeProfileValueInit) {
            return;
        }
        window.__rotradeProfileValueInit = true;
        observer = new MutationObserver(scheduleRender);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
        });
        window.addEventListener('hashchange', scheduleRender);
        window.addEventListener('popstate', scheduleRender);
        if (
            typeof chrome !== 'undefined' &&
            chrome.storage &&
            chrome.storage.onChanged &&
            typeof chrome.storage.onChanged.addListener === 'function'
        ) {
            try {
                chrome.storage.onChanged.addListener(function (changes, areaName) {
                    if (areaName !== 'local' || !changes.rotradeSettings) {
                        return;
                    }
                    refreshMetricFromStorage();
                });
            } catch {}
        }
        refreshMetricFromStorage();
        scheduleRender();
        if (window.Utils && typeof window.Utils.delay === 'function') {
            window.Utils.delay(500).then(scheduleRender);
            window.Utils.delay(1500).then(scheduleRender);
        }
    }
    window.ProfileValueContext = {
        init: init,
        scheduleRender: scheduleRender,
    };
})();
