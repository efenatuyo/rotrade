(function () {
    'use strict';

    const SEND_BUTTON_CLASS = 'rotrade-trade-detail-send-button';
    const SEND_BUTTON_TOOLTIP = 'Send a brand new trade to this user';

    function onTradesPage() {
        const path = window.location.pathname;
        const normalized = window.Routing ? window.Routing.normalizePath(path) : path;
        if (normalized !== '/trades') return false;
        if (document.body && document.body.classList.contains('path-auto-trades-send')) {
            return false;
        }
        return true;
    }

    function findCounterButton() {
        return document.querySelector(
            '.trade-buttons [ng-click="counterTrade(data.trade)"], .trade-buttons button[ng-click*="counterTrade"]'
        );
    }

    function findPartnerUserId() {
        const selectedRow = document.querySelector('.trade-row.selected');
        if (selectedRow) {
            const avatarLink = selectedRow.querySelector(
                '.avatar-card-link, a[href*="/users/"]'
            );
            if (avatarLink) {
                const path = avatarLink.pathname || avatarLink.getAttribute('href') || '';
                const m = path.match(/\/users\/(\d+)/);
                if (m) return m[1];
            }
        }
        const headers = document.querySelectorAll('h2.trades-header-nowrap');
        for (let i = 0; i < headers.length; i++) {
            const partner =
                headers[i].querySelector('a.paired-name[href*="/users/"]') ||
                headers[i].querySelector('a[href*="/users/"]');
            if (partner) {
                const href =
                    partner.getAttribute('href') || partner.getAttribute('ng-href') || '';
                const m = href.match(/\/users\/(\d+)/);
                if (m) return m[1];
            }
        }
        return null;
    }

    function decorate() {
        if (!onTradesPage()) return;
        const counter = findCounterButton();
        if (!counter || !counter.parentNode) return;
        if (counter.parentNode.querySelector(':scope > .' + SEND_BUTTON_CLASS)) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-control-md ng-binding ' + SEND_BUTTON_CLASS;
        button.textContent = 'Send';
        button.title = SEND_BUTTON_TOOLTIP;
        button.setAttribute('data-original-title', SEND_BUTTON_TOOLTIP);
        button.setAttribute('data-toggle', 'tooltip');
        button.setAttribute('uib-tooltip', SEND_BUTTON_TOOLTIP);
        button.setAttribute('tooltip-placement', 'top');
        button.setAttribute('tooltip-append-to-body', 'true');
        button.setAttribute('aria-label', SEND_BUTTON_TOOLTIP);
        button.style.marginLeft = '6px';
        button.style.marginBottom = '5px';
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const userId = findPartnerUserId();
            if (!userId) {
                return;
            }
            window.location.href =
                'https://www.roblox.com/users/' + encodeURIComponent(userId) + '/trade';
        });
        counter.parentNode.insertBefore(button, counter.nextSibling);
        const tradeButtons = counter.closest('.trade-buttons');
        if (tradeButtons) {
            tradeButtons.style.padding = '5px';
            tradeButtons
                .querySelectorAll('.btn-control-md, .btn-cta-md')
                .forEach(function (el) {
                    el.style.marginBottom = '5px';
                });
        }
    }

    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
            scheduled = false;
            try {
                decorate();
            } catch {}
        });
    }

    function init() {
        if (window.__rotradeTradeDetailSendButtonInit) {
            return;
        }
        window.__rotradeTradeDetailSendButtonInit = true;
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

    window.TradeDetailSendButton = {
        init: init,
        schedule: schedule,
        decorate: decorate,
    };
})();
