(function () {
    'use strict';

    function extractItemIdFromCard(card) {
        if (window.ProofsLinkExtractor && window.ProofsLinkExtractor.extractItemId) {
            const id = window.ProofsLinkExtractor.extractItemId(card);
            if (id) {
                return id;
            }
        }
        const thumb =
            card.querySelector('.thumbnail-2d-container[thumbnail-target-id]') ||
            card.querySelector('thumbnail-2d[thumbnail-target-id]');
        if (thumb) {
            const id = thumb.getAttribute('thumbnail-target-id');
            if (id) {
                return id;
            }
        }
        const catalog = card.querySelector('a[href*="/catalog/"]');
        if (catalog) {
            const href = catalog.getAttribute('href') || catalog.getAttribute('ng-href') || '';
            const m = href.match(/\/catalog\/(\d+)/i);
            if (m) {
                return m[1];
            }
        }
        const bundle = card.querySelector('a[href*="/bundles/"]');
        if (bundle) {
            const href = bundle.getAttribute('href') || bundle.getAttribute('ng-href') || '';
            const m = href.match(/\/bundles\/(\d+)/i);
            if (m) {
                return m[1];
            }
        }
        return null;
    }

    function collectNumericAttributeCandidates(card) {
        const out = [];
        const container = card.querySelector('.item-card-container');
        if (!container) {
            return out;
        }
        for (let i = 0; i < container.attributes.length; i++) {
            const v = container.attributes[i].value;
            if (/^\d{10,}$/.test(v)) {
                out.push(v);
            }
        }
        return out;
    }

    function collectItemIdCandidates(card) {
        const primary = extractItemIdFromCard(card);
        const list = [];
        if (primary) {
            list.push(String(primary).trim());
        }
        list.push.apply(list, collectNumericAttributeCandidates(card));
        const seen = new Set();
        const uniq = [];
        for (let i = 0; i < list.length; i++) {
            const x = list[i];
            if (!seen.has(x)) {
                seen.add(x);
                uniq.push(x);
            }
        }
        return uniq;
    }

    function resolveItemIdPair(card) {
        const candidates = collectItemIdCandidates(card);
        if (candidates.length === 0) {
            return null;
        }
        const normalize =
            window.TradeItemIdAliases && window.TradeItemIdAliases.normalizeTradeItemId
                ? window.TradeItemIdAliases.normalizeTradeItemId.bind(window.TradeItemIdAliases)
                : function (x) {
                      return String(x).trim();
                  };
        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            const n = normalize(c);
            if (n !== c) {
                return {
                    rawItemId: c,
                    itemId: n,
                };
            }
        }
        const main = candidates[0];
        return {
            rawItemId: main,
            itemId: normalize(main),
        };
    }

    function extractItemNameFromCard(card) {
        if (window.ProofsLinkExtractor && window.ProofsLinkExtractor.extractItemName) {
            const name = window.ProofsLinkExtractor.extractItemName(card);
            if (name) {
                return name;
            }
        }
        const nameEl = card.querySelector('.item-card-name');
        if (nameEl) {
            const t = (nameEl.textContent || nameEl.getAttribute('title') || '').trim();
            if (t) {
                return t;
            }
        }
        return null;
    }

    function classifyOfferHeader(headerText) {
        const t = (headerText || '').toLowerCase();
        if (t.includes('receive')) {
            return 'received';
        }
        if (t.includes('give') || /\bgave\b/.test(t)) {
            return 'given';
        }
        return 'unknown';
    }

    function findPartnerUserLink(detail) {
        const header = detail.querySelector('h2.trades-header-nowrap');
        const scope = header || detail;
        const direct =
            scope.querySelector('a.paired-name[href*="/users/"]') ||
            scope.querySelector('a[href*="/users/"][href*="/profile"]');
        if (direct) {
            return direct;
        }
        const anyUser = detail.querySelectorAll('a[href*="/users/"]');
        for (let i = 0; i < anyUser.length; i++) {
            const h = anyUser[i].getAttribute('href') || anyUser[i].getAttribute('ng-href') || '';
            if (/\/users\/\d+/.test(h) && !h.includes('rolimons.com')) {
                return anyUser[i];
            }
        }
        return null;
    }

    function extractPartnerUsername(partnerLink) {
        const raw = (
 (partnerLink).innerText ||
            partnerLink.textContent ||
            ''
        )
            .trim()
            .replace(/\s+/g, ' ');
        if (!raw) {
            return undefined;
        }
        const atIdx = raw.lastIndexOf('@');
        if (atIdx !== -1) {
            const afterAt = raw.slice(atIdx + 1).trim();
            if (afterAt) {
                return afterAt;
            }
        }
        return raw;
    }

    window.TradeDetailParsers = {
        extractItemIdFromCard: extractItemIdFromCard,
        collectNumericAttributeCandidates: collectNumericAttributeCandidates,
        collectItemIdCandidates: collectItemIdCandidates,
        resolveItemIdPair: resolveItemIdPair,
        extractItemNameFromCard: extractItemNameFromCard,
        classifyOfferHeader: classifyOfferHeader,
        findPartnerUserLink: findPartnerUserLink,
        extractPartnerUsername: extractPartnerUsername,
    };
})();
