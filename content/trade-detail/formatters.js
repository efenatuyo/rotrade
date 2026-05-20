(function () {
    'use strict';

    function formatCollectiblesPhrase(count) {
        const c = Math.round(Number(count));
        if (!isFinite(c) || c < 0) {
            return '— collectibles';
        }
        if (c === 1) {
            return '1 collectible';
        }
        return String(c) + ' collectibles';
    }

    function formatCompactInventoryValue(num) {
        const n = Math.round(Number(num));
        if (!isFinite(n)) {
            return '';
        }
        const sign = n < 0 ? '-' : '';
        const v = Math.abs(n);
        if (v < 1e3) {
            return sign + String(v);
        }
        if (v < 1e6) {
            const k = v / 1e3;
            const s =
                v >= 1e4
                    ? String(Math.round(k))
                    : String(Math.round(k * 10) / 10).replace(/\.0$/, '');
            return sign + s + 'K';
        }
        if (v < 1e9) {
            const m = v / 1e6;
            const s =
                v >= 1e7
                    ? String(Math.round(m))
                    : String(Math.round(m * 10) / 10).replace(/\.0$/, '');
            return sign + s + 'M';
        }
        const b = v / 1e9;
        return sign + String(Math.round(b * 10) / 10).replace(/\.0$/, '') + 'B';
    }

    function scaleFontSizeSmaller(pxStr, factor) {
        const m = /^([\d.]+)px$/.exec(String(pxStr || '').trim());
        if (!m) {
            return pxStr;
        }
        const n = Math.round(parseFloat(m[1]) * factor * 10) / 10;
        return n + 'px';
    }

    function formatPartnerValueLine(amountCompact, mode, collectiblesCount) {
        if (mode === 'loading') {
            return 'User has … value | … collectibles';
        }
        if (mode === 'error') {
            return 'User has — value | — collectibles';
        }
        const amt = amountCompact ? String(amountCompact) : '—';
        const col =
            collectiblesCount !== undefined && collectiblesCount !== null
                ? formatCollectiblesPhrase(collectiblesCount)
                : '— collectibles';
        return 'User has ' + amt + ' value | ' + col;
    }

    function formatUsdAmountDisplay(n) {
        if (!isFinite(n)) {
            return '';
        }
        const trimmed = n.toFixed(2).replace(/\.?0+$/, '');
        if (trimmed.indexOf('.') === -1) {
            return parseInt(trimmed, 10).toLocaleString('en-US');
        }
        const parts = trimmed.split('.');
        const intNum = parseInt(parts[0], 10);
        return intNum.toLocaleString('en-US') + '.' + parts[1];
    }

    function formatRolimonsValueDisplay(n) {
        if (!isFinite(n)) {
            return '';
        }
        return Math.round(n).toLocaleString('en-US');
    }

    function rolimonsValueFromItemArray(arr) {
        if (!Array.isArray(arr) || arr.length < 5) {
            return null;
        }
        const v = arr[4];
        if (v === null || v === undefined) {
            return null;
        }
        const n = typeof v === 'number' ? v : Number(v);
        if (!isFinite(n)) {
            return null;
        }
        return n;
    }

    function rolimonsRapFromItemArray(arr) {
        if (!Array.isArray(arr) || arr.length < 3) {
            return null;
        }
        const v = arr[2];
        if (v === null || v === undefined) {
            return null;
        }
        const n = typeof v === 'number' ? v : Number(v);
        if (!isFinite(n)) {
            return null;
        }
        return n;
    }

    window.TradeDetailFormatters = {
        formatCollectiblesPhrase: formatCollectiblesPhrase,
        formatCompactInventoryValue: formatCompactInventoryValue,
        scaleFontSizeSmaller: scaleFontSizeSmaller,
        formatPartnerValueLine: formatPartnerValueLine,
        formatUsdAmountDisplay: formatUsdAmountDisplay,
        formatRolimonsValueDisplay: formatRolimonsValueDisplay,
        rolimonsValueFromItemArray: rolimonsValueFromItemArray,
        rolimonsRapFromItemArray: rolimonsRapFromItemArray,
    };
})();
