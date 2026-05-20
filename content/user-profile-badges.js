(function () {
    'use strict';

    const CONTAINER_ID = 'roli-badges-container';
    let badgesEnabled = true;
    function readBadgesEnabled(settings) {
        if (!settings || typeof settings !== 'object') {
            return true;
        }
        return settings.userProfileBadgesEnabled !== false;
    }
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['rotradeSettings'], function (r) {
                badgesEnabled = readBadgesEnabled(r && r.rotradeSettings);
                if (!badgesEnabled) {
                    try {
                        const existing = document.getElementById(CONTAINER_ID);
                        if (existing) existing.remove();
                    } catch {}
                }
            });
            if (chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(function (changes, areaName) {
                    if (areaName !== 'local' || !changes || !changes.rotradeSettings) {
                        return;
                    }
                    badgesEnabled = readBadgesEnabled(changes.rotradeSettings.newValue);
                    if (!badgesEnabled) {
                        try {
                            const existing = document.getElementById(CONTAINER_ID);
                            if (existing) existing.remove();
                        } catch {}
                    } else {
                        try {
                            if (window.RoliBadges && window.RoliBadges.schedule) {
                                window.RoliBadges.schedule();
                            }
                        } catch {}
                    }
                });
            }
        }
    } catch {}
    const BADGE_ORDER = [
        'value_20m',
        'value_10m',
        'value_5m',
        'value_1m',
        'value_500k',
        'value_100k',
        'roli_award_winner',
        'roli_award_nominee',
        'own_lucky_cat_uaid',
        'own_1_serial_1',
        'own_1_serial_1337',
        'own_1_sequential_serial',
        'own_1_serial_1_to_9',
        'own_1_big_dominus',
        'own_1_dominus',
        'own_1_stf',
        'own_1_valued_federation_item',
        'own_1_immortal_sword',
        'own_epic_katana_set',
        'own_1_kotn_item',
        'own_15_noob',
        'own_5_noob',
        'own_10_rares',
        'own_3_rares',
        'own_1_rare',
        'create_10000_trade_ads',
        'create_1000_trade_ads',
        'create_100_trade_ads',
        'create_10_trade_ads',
        'own_all_asset_types',
        'own_50_pct_of_1_item',
        'own_25_pct_of_1_item',
        'own_10_pct_of_1_item',
        'own_100_of_1_item',
        'own_50_of_1_item',
        'own_10_of_1_item',
        'own_1000_items',
        'own_100_items',
        'own_10_items',
        'contributor',
        'sword_fighting_champion',
        'event_winner',
        'game_night_winner',
        'booster',
        'verified',
        'roligang',
    ];
    const BADGE_TITLES = {
        value_20m: '20M+',
        value_10m: '10M+',
        value_5m: '5M+',
        value_1m: '1M+',
        value_500k: '500K+',
        value_100k: '100K+',
        roli_award_winner: 'Roli Award Winner',
        roli_award_nominee: 'Roli Award Nominee',
        own_lucky_cat_uaid: 'Lucky Cat',
        own_1_serial_1: 'Serial #1',
        own_1_serial_1337: 'L337',
        own_1_sequential_serial: 'Sequential Serial',
        own_1_serial_1_to_9: 'Low Serial',
        own_1_big_dominus: 'Big Dominator',
        own_1_dominus: 'Dominator',
        own_1_stf: 'Sparkly',
        own_1_valued_federation_item: 'Federated',
        own_1_immortal_sword: 'Enduring',
        own_epic_katana_set: 'Epic Blade Collector',
        own_1_kotn_item: 'Evening Royalty',
        own_15_noob: 'Noobie',
        own_5_noob: 'Noob',
        own_10_rares: 'Rare Supremist',
        own_3_rares: 'Rare Enthusiast',
        own_1_rare: 'Rare Owner',
        create_10000_trade_ads: 'Boundless Trader',
        create_1000_trade_ads: 'Active Trader',
        create_100_trade_ads: 'Frequent Trader',
        create_10_trade_ads: 'Trade Advertiser',
        own_all_asset_types: 'Accessorized',
        own_50_pct_of_1_item: 'Uncontrollable Addiction',
        own_25_pct_of_1_item: 'Unhealthy Obsession',
        own_10_pct_of_1_item: 'Modest Enthusiasm',
        own_100_of_1_item: 'Mega Hoarder',
        own_50_of_1_item: 'Hoarder',
        own_10_of_1_item: 'Mini Hoarder',
        own_1000_items: 'Incurable Collector',
        own_100_items: 'Devout Collector',
        own_10_items: 'Collector',
        contributor: 'Contributor',
        sword_fighting_champion: 'Sword Fighting Champion',
        event_winner: 'Event Winner',
        game_night_winner: 'Game Night Winner',
        booster: 'Booster',
        verified: 'Verified',
        roligang: 'Roligang',
    };

    let inflight = null;
    const fetched = new Map();
    let lastRenderedUserId = null;
    let contextInvalidated = false;

    function isExtensionContextValid() {
        if (contextInvalidated) return false;
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch {
            return false;
        }
    }

    function markContextInvalidated() {
        contextInvalidated = true;
    }

    function safeRuntimeUrl(path) {
        try {
            return chrome.runtime.getURL(path);
        } catch {
            markContextInvalidated();
            return '';
        }
    }

    function parseProfileUserId() {
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        const m = normalized.match(/^\/users\/(\d+)\/profile\/?$/);
        return m ? m[1] : null;
    }

    function fetchPlayerInfo(userId) {
        if (fetched.has(userId)) {
            return Promise.resolve(fetched.get(userId));
        }
        if (inflight && inflight.userId === userId) {
            return inflight.promise;
        }
        if (!isExtensionContextValid()) {
            return Promise.resolve(null);
        }
        const promise = new Promise(function (resolve) {
            try {
                chrome.runtime.sendMessage(
                    { action: 'fetchRolimonsPlayerInfo', userId: userId },
                    function (response) {
                        try {
                            if (chrome.runtime.lastError) {
                                const msg = chrome.runtime.lastError.message || '';
                                if (msg.indexOf('context invalidated') !== -1) {
                                    markContextInvalidated();
                                }
                                resolve(null);
                                return;
                            }
                            if (!response || !response.success) {
                                resolve(null);
                                return;
                            }
                            resolve(response.data || null);
                        } catch {
                            resolve(null);
                        }
                    }
                );
            } catch (err) {
                if (err && /context invalidated/i.test(String(err.message || err))) {
                    markContextInvalidated();
                }
                resolve(null);
            }
        }).then(function (data) {
            if (data !== null) {
                fetched.set(userId, data);
            }
            return data;
        });
        inflight = { userId: userId, promise: promise };
        promise.finally(function () {
            if (inflight && inflight.userId === userId) {
                inflight = null;
            }
        });
        return promise;
    }

    function buildBadgeListHtml(userId, badgeSlugs) {
        const owned = new Set(badgeSlugs);
        const items = [];
        const href = 'https://www.rolimons.com/playerrolibadges/' + encodeURIComponent(userId);
        for (let i = 0; i < BADGE_ORDER.length; i++) {
            const slug = BADGE_ORDER[i];
            if (!owned.has(slug)) {
                continue;
            }
            const title = BADGE_TITLES[slug] || slug;
            const src = safeRuntimeUrl('assets/roliBadges/' + slug + '.svg');
            if (!src) {
                continue;
            }
            items.push(
                '<a class="rotrade-roli-badge" href="' +
                    href +
                    '" target="_blank" rel="noopener noreferrer" title="' +
                    escapeHtml(title) +
                    '" aria-label="' +
                    escapeHtml(title) +
                    '">' +
                    '<img class="rotrade-roli-badge-img" src="' +
                    src +
                    '" alt="' +
                    escapeHtml(title) +
                    '">' +
                    '</a>'
            );
        }
        return items.join('');
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function injectStyles() {
        const STYLE_ID = 'rotrade-roli-badges-styles';
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .rotrade-roli-badges-inline {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 4px;
                margin-top: 4px;
            }
            .rotrade-roli-badges-inline .rotrade-roli-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 64px;
                height: 64px;
                border-radius: 12px;
                line-height: 0;
                text-decoration: none;
                transition: background-color 0.15s ease, transform 0.15s ease;
            }
            .rotrade-roli-badges-inline .rotrade-roli-badge:hover {
                background-color: rgba(127, 127, 127, 0.18);
                transform: scale(1.08);
                text-decoration: none;
            }
            .rotrade-roli-badges-inline .rotrade-roli-badge-img {
                width: 56px;
                height: 56px;
                object-fit: contain;
                display: block;
            }
        `;
        document.head.appendChild(style);
    }

    function findInsertionAnchor() {
        const usernameSpan =
            document.querySelector('.user-profile-header-info .stylistic-alts-username') ||
            document.getElementById('profile-header-title-container-name');
        if (usernameSpan) {
            const column = usernameSpan.closest('.flex.flex-col.min-width-0');
            if (column) {
                return { el: column, position: 'beforeend' };
            }
        }
        const headerInfo = document.querySelector('.user-profile-header-info');
        if (headerInfo) {
            return { el: headerInfo, position: 'afterend' };
        }
        return null;
    }

    function isAnchoredCorrectly(existing, anchor) {
        if (!existing || !anchor || !anchor.el) return false;
        if (anchor.position === 'afterend') {
            return existing.previousElementSibling === anchor.el;
        }
        if (anchor.position === 'beforeend') {
            return existing.parentElement === anchor.el;
        }
        return false;
    }

    function ensureContainer(userId) {
        const anchor = findInsertionAnchor();
        if (!anchor) {
            return null;
        }
        const existing = document.getElementById(CONTAINER_ID);
        if (existing) {
            if (isAnchoredCorrectly(existing, anchor)) {
                return existing;
            }
            existing.remove();
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'rotrade-roli-badges-inline';
        wrapper.id = CONTAINER_ID;
        anchor.el.insertAdjacentElement(anchor.position, wrapper);
        return wrapper;
    }

    function removeContainer() {
        const existing = document.getElementById(CONTAINER_ID);
        if (existing) {
            existing.remove();
        }
    }

    function renderForUser(userId, data) {
        if (!data || !data.rolibadges || typeof data.rolibadges !== 'object') {
            removeContainer();
            return;
        }
        const slugs = Object.keys(data.rolibadges);
        if (slugs.length === 0) {
            removeContainer();
            return;
        }
        injectStyles();
        const container = ensureContainer(userId);
        if (!container) {
            return;
        }
        const html = buildBadgeListHtml(userId, slugs);
        const sig = html.length + ':' + slugs.length + ':' + userId;
        if (container.dataset.rotradeSig === sig) {
            return;
        }
        container.innerHTML = html;
        container.dataset.rotradeSig = sig;
    }

    function run() {
        if (!isExtensionContextValid()) {
            return;
        }
        if (!badgesEnabled) {
            removeContainer();
            lastRenderedUserId = null;
            return;
        }
        const userId = parseProfileUserId();
        if (!userId) {
            removeContainer();
            lastRenderedUserId = null;
            return;
        }
        if (userId !== lastRenderedUserId) {
            removeContainer();
            lastRenderedUserId = userId;
        }
        fetchPlayerInfo(userId).then(function (data) {
            if (parseProfileUserId() !== userId) {
                return;
            }
            try {
                renderForUser(userId, data);
            } catch {}
        }).catch(function () {});
    }

    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        if (!isExtensionContextValid()) return;
        scheduled = true;
        requestAnimationFrame(function () {
            scheduled = false;
            try {
                run();
            } catch {}
        });
    }

    function init() {
        if (window.__rotradeRoliBadgesInit) {
            return;
        }
        window.__rotradeRoliBadgesInit = true;
        schedule();
        if (window.Scheduler && typeof window.Scheduler.onBodyMutation === 'function') {
            try {
                window.Scheduler.onBodyMutation(schedule);
            } catch {}
        }
        window.addEventListener('hashchange', schedule);
        window.addEventListener('popstate', schedule);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.RoliBadges = {
        init: init,
        schedule: schedule,
        run: run,
    };
})();
