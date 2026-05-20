(function () {
    'use strict';
    if (window.__rotradeTradeRowIdBridgeInstalled) {
        return;
    }
    window.__rotradeTradeRowIdBridgeInstalled = true;

    function tradeIdFromRow(row, ng) {
        try {
            if (!ng || !ng.element) {
                return null;
            }
            var scope = ng.element(row).scope();
            var hops = 0;
            while (scope && hops < 6) {
                if (scope.trade && scope.trade.id != null) {
                    return scope.trade.id;
                }
                if (scope.$parent === scope) {
                    break;
                }
                scope = scope.$parent;
                hops++;
            }
            var iso = ng.element(row).isolateScope && ng.element(row).isolateScope();
            if (iso && iso.trade && iso.trade.id != null) {
                return iso.trade.id;
            }
        } catch (e) {
        }
        return null;
    }

    function firstDefined(obj, keys) {
        if (!obj) return null;
        for (var i = 0; i < keys.length; i++) {
            var v = obj[keys[i]];
            if (v != null && v !== '') {
                return v;
            }
        }
        return null;
    }

    function pickItemFromScope(scope) {
        if (!scope) return null;
        var candidates = ['userAsset', 'item', 'asset', 'tradeItem', 'offerItem', 'collectible'];
        for (var i = 0; i < candidates.length; i++) {
            var c = scope[candidates[i]];
            if (c && typeof c === 'object') {
                return c;
            }
        }
        return null;
    }

    function itemDataFromCard(card, ng) {
        try {
            if (!ng || !ng.element) {
                return null;
            }
            var scope = ng.element(card).scope();
            var hops = 0;
            while (scope && hops < 6) {
                var item = pickItemFromScope(scope);
                if (item) {
                    return item;
                }
                if (scope.$parent === scope) {
                    break;
                }
                scope = scope.$parent;
                hops++;
            }
            var iso = ng.element(card).isolateScope && ng.element(card).isolateScope();
            if (iso) {
                var iItem = pickItemFromScope(iso);
                if (iItem) return iItem;
            }
        } catch (e) {
        }
        return null;
    }

    function setAttrIfChanged(el, name, value) {
        if (value == null || value === '') {
            return;
        }
        var s = String(value);
        if (el.getAttribute(name) !== s) {
            el.setAttribute(name, s);
        }
    }

    function tagItemCard(card, ng) {
        var item = itemDataFromCard(card, ng);
        if (!item) {
            return;
        }
        var uaid = firstDefined(item, ['userAssetId', 'uaid', 'userAssetID']);
        var assetId = firstDefined(item, [
            'assetId',
            'assetID',
            'id',
            'targetId',
        ]);
        if (!assetId && item.itemTarget) {
            assetId = firstDefined(item.itemTarget, ['targetId', 'id', 'assetId']);
        }
        var ciid = firstDefined(item, [
            'collectibleItemInstanceId',
            'ciid',
            'collectibleItemInstanceID',
        ]);
        setAttrIfChanged(card, 'data-rotrade-uaid', uaid);
        setAttrIfChanged(card, 'data-rotrade-asset-id', assetId);
        setAttrIfChanged(card, 'data-rotrade-ciid', ciid);
    }

    function tagRows() {
        var ng = window.angular;
        var rows = document.querySelectorAll('.trade-row');
        var tagged = 0;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var id = tradeIdFromRow(row, ng);
            if (id != null && String(id).length) {
                if (row.getAttribute('data-rotrade-trade-id') !== String(id)) {
                    row.setAttribute('data-rotrade-trade-id', String(id));
                }
                tagged++;
            }
        }
        var cards = document.querySelectorAll('.trade-item-card');
        for (var j = 0; j < cards.length; j++) {
            tagItemCard(cards[j], ng);
        }
        try {
            document.dispatchEvent(
                new CustomEvent('rotrade:tradeRowsTagged', {
                    detail: { tagged: tagged, total: rows.length },
                })
            );
        } catch (e) {}
    }

    document.addEventListener('rotrade:tagTradeRows', tagRows);
    tagRows();
})();
