(function() {
    'use strict';

    const { TradeDisplayCore, TradeDisplayRenderer, TradeDisplayPagination, TradeDisplaySizing, Utils } = window;
    const tradesCache = new Map();

    const getTradesKey = (id) => id.replace('-container', '') + 'Trades';

    const storeTrades = (id, trades) => {
        window[getTradesKey(id)] = trades;
    };

    const getStoredTrades = (id, fallback) => {
        return window[getTradesKey(id)] || fallback;
    };

    const setupSizing = (id) => {
        Utils.nextFrame(() => TradeDisplaySizing.applySizing(id));
        Utils.delay(100).then(() => TradeDisplaySizing.applySizing(id));
        Utils.delay(500).then(() => TradeDisplaySizing.applySizing(id));
    };

    const loadThumbs = (id) => {
        Utils.nextFrame(() => {
            if (window.loadAutoTradeItemThumbnails) window.loadAutoTradeItemThumbnails(id);
        });
    };

    const renderTrades = (trades, id) => trades.map(t => TradeDisplayRenderer.renderCard(t, id)).join('');

    const setupPag = (id, sorted, curr, total, onRefresh) => {
        const els = TradeDisplayPagination.getPagEls(id);
        if (!els) return;
        TradeDisplayPagination.updateDisplay(els, curr, total);
        TradeDisplayPagination.updateSortBtn(els, id, TradeDisplayCore.getSort(id));
        TradeDisplayPagination.setupHandlers(els, id, curr, total, onRefresh, onRefresh);
    };

    function displayTrades(trades, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const sortOrder = TradeDisplayCore.getSort(containerId);
        const sortedTrades = TradeDisplayCore.sortTrades(trades, sortOrder);
        storeTrades(containerId, sortedTrades);

        const perPage = 12;
        let currPage = TradeDisplayCore.getPage(containerId);
        if (isNaN(currPage) || currPage < 1) {
            currPage = 1;
            TradeDisplayCore.setPage(containerId, 1);
        }
        const pag = TradeDisplayCore.calcPag(sortedTrades.length, perPage, currPage);
        
        if (pag.currentPage !== currPage) {
            TradeDisplayCore.setPage(containerId, pag.currentPage);
            currPage = pag.currentPage;
        }

        container.innerHTML = '';

        if (trades.length === 0) {
            TradeDisplayPagination.showPag(containerId, false);
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">No Trades Found</div><div class="empty-state-text">${TradeDisplayCore.getEmptyMsg(containerId)}</div></div>`;
            return;
        }

        TradeDisplayPagination.showPag(containerId, true);
        const tradesToShow = TradeDisplayCore.getPagItems(sortedTrades, perPage, currPage);
        container.innerHTML = renderTrades(tradesToShow, containerId);

        const refreshFn = () => {
            displayTrades(getStoredTrades(containerId, trades), containerId);
        };

        setupPag(containerId, sortedTrades, currPage, pag.totalPages, refreshFn);
        setupSizing(containerId);
        loadThumbs(containerId);
    }

    window.TradeDisplayTrades = { displayTrades };
    window.displayTrades = displayTrades;

})();
