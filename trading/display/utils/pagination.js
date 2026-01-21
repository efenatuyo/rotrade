(function() {
    'use strict';

    const { TradeDisplayCore } = window;
    const elCache = new Map();

    const getPagElId = (id) => id.replace('-container', '') + '-pagination';

    const getPagEls = (containerId) => {
        const pagId = getPagElId(containerId);
        if (elCache.has(pagId)) {
            const cached = elCache.get(pagId);
            if (cached.container && document.contains(cached.container)) return cached;
            elCache.delete(pagId);
        }
        const pagEl = document.getElementById(pagId);
        if (!pagEl) return null;
        const baseId = containerId.replace('-container', '');
        const els = {
            container: pagEl,
            current: pagEl.querySelector(`#${baseId}-pagination-current`),
            total: pagEl.querySelector(`#${baseId}-pagination-total-pages`),
            prev: pagEl.querySelector(`#${baseId}-pagination-prev`),
            next: pagEl.querySelector(`#${baseId}-pagination-next`),
            sortBtn: pagEl.querySelector(`#${baseId}-sort-btn`),
            sortIcon: pagEl.querySelector(`#${baseId}-sort-icon`)
        };
        elCache.set(pagId, els);
        return els;
    };

    const updateDisplay = (els, curr, total) => {
        if (els.current) els.current.textContent = `Page ${curr}`;
        if (els.total) els.total.textContent = total;
        if (els.prev) els.prev.disabled = curr <= 1;
        if (els.next) els.next.disabled = curr >= total;
    };

    const updateSortBtn = (els, containerId, sort) => {
        if (!els.sortBtn) return;
        const icon = sort === 'oldest' ? '↓' : '↑';
        const text = sort === 'oldest' ? 'Oldest First' : 'Newest First';
        const baseId = containerId.replace('-container', '');
        els.sortBtn.innerHTML = `<span id="${baseId}-sort-icon">${icon}</span> ${text}`;
        if (els.sortIcon) els.sortIcon.textContent = icon;
    };

    const setupHandlers = (els, containerId, curr, total, onPage, onSort) => {
        if (els.prev) {
            els.prev.onclick = () => {
                if (curr > 1) {
                    TradeDisplayCore.setPage(containerId, curr - 1);
                    onPage();
                }
            };
        }
        if (els.next) {
            els.next.onclick = () => {
                if (curr < total) {
                    TradeDisplayCore.setPage(containerId, curr + 1);
                    onPage();
                }
            };
        }
        if (els.sortBtn) {
            els.sortBtn.onclick = () => {
                const newSort = TradeDisplayCore.getSort(containerId) === 'oldest' ? 'newest' : 'oldest';
                TradeDisplayCore.setSort(containerId, newSort);
                TradeDisplayCore.setPage(containerId, 1);
                onSort();
            };
        }
    };

    const showPag = (containerId, show = true) => {
        const pagEl = document.getElementById(getPagElId(containerId));
        if (pagEl) pagEl.style.display = show ? 'flex' : 'none';
    };

    window.TradeDisplayPagination = {
        getPagEls, updateDisplay, updateSortBtn, setupHandlers, showPag
    };

})();
