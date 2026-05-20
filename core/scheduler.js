(function () {
    'use strict';
    const intervals = new Map();
    const observerRegions = new Map();
    function isVisible() {
        return document.visibilityState === 'visible';
    }
    function everyVisible(name, ms, fn) {
        cancel(name);
        const wrapped = () => {
            if (!isVisible()) return;
            try {
                fn();
            } catch (err) {
                if (window.Utils?.Logger?.log) {
                    window.Utils.Logger.log('scheduler_tick_error', {
                        name: name,
                        message: err && err.message,
                    });
                }
            }
        };
        const id = setInterval(wrapped, ms);
        intervals.set(name, { id: id, ms: ms, fn: wrapped, lastRun: 0 });
        if (window.tradeStatusIntervals) {
            window.tradeStatusIntervals.add(id);
        } else {
            window.tradeStatusIntervals = new Set([id]);
        }
        return id;
    }
    function cancel(name) {
        const entry = intervals.get(name);
        if (!entry) return;
        clearInterval(entry.id);
        if (window.tradeStatusIntervals) {
            window.tradeStatusIntervals.delete(entry.id);
        }
        intervals.delete(name);
    }
    function getRegion(rootResolver, options) {
        const key = options.key;
        let region = observerRegions.get(key);
        if (region && region.root && document.contains(region.root)) {
            return region;
        }
        const root = rootResolver();
        if (!root) return null;
        const subscribers = new Set();
        let frame = 0;
        const flush = () => {
            frame = 0;
            subscribers.forEach((sub) => {
                try {
                    sub();
                } catch (err) {
                    if (window.Utils?.Logger?.log) {
                        window.Utils.Logger.log('scheduler_observer_error', {
                            region: key,
                            message: err && err.message,
                        });
                    }
                }
            });
        };
        const obs = new MutationObserver(() => {
            if (frame) return;
            frame = requestAnimationFrame(flush);
        });
        obs.observe(root, options.observe || { childList: true, subtree: true });
        region = { root: root, observer: obs, subscribers: subscribers, key: key };
        observerRegions.set(key, region);
        return region;
    }
    function subscribeRegion(rootResolver, options, fn) {
        const region = getRegion(rootResolver, options);
        if (!region) return () => {};
        region.subscribers.add(fn);
        return () => {
            region.subscribers.delete(fn);
            if (region.subscribers.size === 0) {
                region.observer.disconnect();
                observerRegions.delete(region.key);
            }
        };
    }
    function onSidebarMutation(fn) {
        return subscribeRegion(
            () => {
                if (window.RobloxSelectors) {
                    const nav = window.RobloxSelectors.find('navTradeLink');
                    if (nav) return nav.closest('nav, ul');
                }
                return (
                    document.querySelector('a[id="nav-trade"]')?.closest('nav, ul') ||
                    document.querySelector('a[href*="/trades"]')?.closest('nav, ul')
                );
            },
            { key: 'sidebar', observe: { childList: true, subtree: false } },
            fn
        );
    }
    function onBodyMutation(fn) {
        return subscribeRegion(
            () => document.body,
            { key: 'body', observe: { childList: true, subtree: true } },
            fn
        );
    }
    document.addEventListener('visibilitychange', () => {
        if (!isVisible()) return;
        intervals.forEach((entry) => {
            entry.fn();
        });
    });
    window.Scheduler = {
        everyVisible: everyVisible,
        cancel: cancel,
        onSidebarMutation: onSidebarMutation,
        onBodyMutation: onBodyMutation,
        isVisible: isVisible,
    };
})();
