(function () {
    'use strict';

    const LINK_CLASS = 'rotrade-rolimons-profile-link';
    const USER_PROFILE_LINK_CLASS = 'rotrade-rolimons-user-profile-link';
    const STYLE_ID = 'rotrade-rolimons-profile-link-styles';
    const TOOLTIP = "Open profile on Rolimon's";
    const USER_PROFILE_TOOLTIP = "Quick link to Rolimon's page";

    function onTradePage() {
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        if (normalized !== '/trades') return false;
        if (document.body && document.body.classList.contains('path-auto-trades-send')) {
            return false;
        }
        return true;
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

    function parseUserProfileId() {
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        const m = normalized.match(/^\/users\/(\d+)\/profile\/?$/);
        return m ? m[1] : null;
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${LINK_CLASS} {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                margin-left: 10px;
                background: transparent;
                cursor: pointer;
                vertical-align: middle;
                text-decoration: none;
                transition: transform 0.15s ease;
            }
            .${LINK_CLASS}:hover {
                transform: scale(1.1);
                text-decoration: none;
            }
            .${LINK_CLASS} img {
                width: 28px;
                height: 28px;
                display: block;
                pointer-events: none;
            }
            .${USER_PROFILE_LINK_CLASS} {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                margin-left: 8px;
                background: transparent;
                cursor: pointer;
                vertical-align: middle;
                text-decoration: none;
                transition: transform 0.15s ease;
                order: 1;
            }
            .${USER_PROFILE_LINK_CLASS}:hover {
                transform: scale(1.1);
                text-decoration: none;
            }
            .${USER_PROFILE_LINK_CLASS} img {
                width: 16px;
                height: 16px;
                display: block;
                pointer-events: none;
            }
            @media (max-width: 767px) {
                .${USER_PROFILE_LINK_CLASS} {
                    width: 10px;
                    height: 10px;
                }
                .${USER_PROFILE_LINK_CLASS} img {
                    width: 10px;
                    height: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function findPartnerLink(header) {
        if (!header) return null;
        const direct =
            header.querySelector('a.paired-name[href*="/users/"]') ||
            header.querySelector('a[href*="/users/"][href*="/profile"]');
        if (direct) return direct;
        const anyUser = header.querySelectorAll('a[href*="/users/"]');
        for (let i = 0; i < anyUser.length; i++) {
            const h =
                anyUser[i].getAttribute('href') || anyUser[i].getAttribute('ng-href') || '';
            if (/\/users\/\d+/.test(h) && !h.includes('rolimons.com')) {
                return anyUser[i];
            }
        }
        return null;
    }

    function decorate() {
        if (!onTradePage()) return;
        const headers = document.querySelectorAll('h2.trades-header-nowrap');
        headers.forEach((header) => {
            const partnerLink = findPartnerLink(header);
            if (!partnerLink) {
                const stale = header.querySelector(':scope > .' + LINK_CLASS);
                if (stale) stale.remove();
                return;
            }
            const href =
                partnerLink.getAttribute('href') || partnerLink.getAttribute('ng-href') || '';
            const match = href.match(/\/users\/(\d+)\b/);
            const userId = match ? match[1] : null;
            if (!userId) {
                const stale = header.querySelector(':scope > .' + LINK_CLASS);
                if (stale) stale.remove();
                return;
            }
            const existing = header.querySelector(':scope > .' + LINK_CLASS);
            const targetHref = `https://www.rolimons.com/player/${encodeURIComponent(userId)}`;
            if (existing) {
                if (existing.getAttribute('href') !== targetHref) {
                    existing.setAttribute('href', targetHref);
                }
                return;
            }
            const link = document.createElement('a');
            link.className = LINK_CLASS;
            link.href = targetHref;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.title = TOOLTIP;
            link.setAttribute('data-original-title', TOOLTIP);
            link.setAttribute('data-toggle', 'tooltip');
            link.setAttribute('uib-tooltip', TOOLTIP);
            link.setAttribute('tooltip-placement', 'bottom');
            link.setAttribute('tooltip-append-to-body', 'true');
            link.setAttribute('aria-label', TOOLTIP);
            link.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            const img = document.createElement('img');
            img.src = rolimonsLinkIconUrl();
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            link.appendChild(img);
            header.appendChild(link);
        });
    }

    function findUserProfileHeaderContainer() {
        const named = document.getElementById('profile-header-title-container-name');
        if (named && named.parentElement) {
            return named.parentElement;
        }
        return (
            document.querySelector('.profile-header-title-container') ||
            document.querySelector('.profile-header-content .profile-header-title') ||
            null
        );
    }

    function resolveUserProfileUserId() {
        const fromPath = parseUserProfileId();
        if (fromPath) return fromPath;
        const el = document.querySelector('[data-profileuserid]');
        if (el) {
            const v = el.getAttribute('data-profileuserid');
            if (v && /^\d+$/.test(v)) return v;
        }
        return null;
    }

    function decorateUserProfile() {
        if (!parseUserProfileId()) return;
        const container = findUserProfileHeaderContainer();
        if (!container) return;
        const userId = resolveUserProfileUserId();
        if (!userId) return;
        const targetHref =
            'https://www.rolimons.com/player/' + encodeURIComponent(userId);
        const existing = container.querySelector(':scope > .' + USER_PROFILE_LINK_CLASS);
        if (existing) {
            if (existing.getAttribute('href') !== targetHref) {
                existing.setAttribute('href', targetHref);
            }
            return;
        }
        const link = document.createElement('a');
        link.className = USER_PROFILE_LINK_CLASS;
        link.href = targetHref;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = USER_PROFILE_TOOLTIP;
        link.setAttribute('aria-label', USER_PROFILE_TOOLTIP);
        link.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        const img = document.createElement('img');
        img.src = rolimonsLinkIconUrl();
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        link.appendChild(img);
        container.appendChild(link);
    }

    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            try {
                decorate();
            } catch {}
            try {
                decorateUserProfile();
            } catch {}
        });
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.RolimonsProfileLink = {
        init: init,
        schedule: schedule,
        decorate: decorate,
        decorateUserProfile: decorateUserProfile,
    };
})();
