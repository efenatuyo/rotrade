(function () {
    'use strict';

    const BUTTON_ID = 'profile-trade-items';
    const canTradeCache = new Map();

    function parseProfileUserId() {
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        const m = normalized.match(/^\/users\/(\d+)\/profile\/?$/);
        return m ? m[1] : null;
    }

    function checkCanTrade(userId) {
        if (canTradeCache.has(userId)) {
            return Promise.resolve(canTradeCache.get(userId));
        }
        const url =
            'https://trades.roblox.com/v1/users/' +
            encodeURIComponent(userId) +
            '/can-trade-with';
        const p = fetch(url, { credentials: 'include' })
            .then(function (r) {
                if (!r.ok) {
                    return { canTrade: false };
                }
                return r.json();
            })
            .then(function (data) {
                const ok = !!(data && data.canTrade);
                canTradeCache.set(userId, ok);
                return ok;
            })
            .catch(function () {
                return false;
            });
        return p;
    }

    function findInsertionParent() {
        const anchor = document.getElementById('profile-block-user');
        if (!anchor || !anchor.parentElement || !anchor.parentElement.parentElement) {
            return null;
        }
        return anchor.parentElement.parentElement;
    }

    function injectButton(parent) {
        if (!parent || document.getElementById(BUTTON_ID)) {
            return;
        }
        const li = document.createElement('li');
        li.setAttribute('ng-show', 'profileHeaderLayout.canTrade');
        const button = document.createElement('button');
        button.setAttribute('role', 'button');
        button.setAttribute('ng-click', 'tradeItems()');
        button.id = BUTTON_ID;
        button.setAttribute('ng-bind', "'Action.TradeItems' | translate");
        button.className = 'ng-binding';
        button.textContent = 'Trade Items';
        button.addEventListener('click', function (e) {
            const userId = parseProfileUserId();
            if (!userId) {
                return;
            }
            const ngEl = window.angular && window.angular.element ? window.angular.element(button) : null;
            const scope = ngEl && ngEl.scope ? ngEl.scope() : null;
            if (scope && typeof scope.tradeItems === 'function') {
                e.preventDefault();
                e.stopPropagation();
                try {
                    scope.$apply(function () {
                        scope.tradeItems();
                    });
                    return;
                } catch {}
            }
            e.preventDefault();
            e.stopPropagation();
            window.location.href =
                'https://www.roblox.com/users/' +
                encodeURIComponent(userId) +
                '/profile?tradeItemsWith=true';
        });
        li.appendChild(button);
        parent.insertAdjacentElement('afterbegin', li);
    }

    function tryInject() {
        const userId = parseProfileUserId();
        if (!userId) {
            return;
        }
        const parent = findInsertionParent();
        if (!parent) {
            return;
        }
        checkCanTrade(userId).then(function (ok) {
            if (!ok) {
                return;
            }
            if (parseProfileUserId() !== userId) {
                return;
            }
            injectButton(parent);
        });
    }

    function bindPopoverTrigger() {
        const popover = document.getElementById('popover-link');
        if (!popover || popover.dataset.rotradeMobileBound === '1') {
            return;
        }
        popover.dataset.rotradeMobileBound = '1';
        popover.addEventListener('click', function () {
            tryInject();
            setTimeout(tryInject, 100);
            setTimeout(tryInject, 350);
        });
    }

    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
            scheduled = false;
            try {
                bindPopoverTrigger();
            } catch {}
            try {
                tryInject();
            } catch {}
        });
    }

    function init() {
        if (window.__rotradeMobileTradeItemsInit) {
            return;
        }
        window.__rotradeMobileTradeItemsInit = true;
        schedule();
        if (window.Scheduler && typeof window.Scheduler.onBodyMutation === 'function') {
            try {
                window.Scheduler.onBodyMutation(schedule);
            } catch {}
        }
        window.addEventListener('hashchange', function () {
            canTradeCache.clear();
            schedule();
        });
        window.addEventListener('popstate', function () {
            canTradeCache.clear();
            schedule();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.MobileTradeItemsButton = {
        init: init,
        schedule: schedule,
        tryInject: tryInject,
    };
})();
