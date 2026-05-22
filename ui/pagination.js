(function () {
    'use strict';
    if (!window._paginationMemory) {
        window._paginationMemory = {};
    }
    async function getCurrentPage() {
        const page = window._paginationMemory['tradesCurrentPage'] || '1';
        const parsed = parseInt(page);
        return isNaN(parsed) ? 1 : parsed;
    }
    function setCurrentPage(page) {
        window._paginationMemory['tradesCurrentPage'] = page.toString();
    }
    function getTradesPerPage() {
        return 9;
    }
    function getTotalPages() {
        const totalTrades = window.filteredOpportunities ? window.filteredOpportunities.length : 0;
        const tradesPerPage = getTradesPerPage();
        return Math.max(1, Math.ceil(totalTrades / tradesPerPage));
    }
    async function updatePaginationControls() {
        const currentPage = await getCurrentPage();
        const totalPages = getTotalPages();
        const currentSpan = DOM.$('#pagination-current');
        const totalSpan = DOM.$('#pagination-total-pages');
        const prevBtn = DOM.$('#pagination-prev');
        const nextBtn = DOM.$('#pagination-next');
        if (currentSpan) currentSpan.textContent = `Page ${currentPage}`;
        if (totalSpan) totalSpan.textContent = totalPages;
        if (prevBtn) {
            prevBtn.disabled = currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = currentPage >= totalPages;
        }
    }
    let _displayTimer = null;
    let _displayWaiters = [];
    let _lastDisplayAt = 0;
    async function _doDisplayCurrentPage() {
        const container = DOM.$('#send-trades-grid');
        if (!container) return;
        const currentPage = await getCurrentPage();
        const tradesPerPage = getTradesPerPage();
        const startIndex = (currentPage - 1) * tradesPerPage;
        const endIndex = startIndex + tradesPerPage;
        if (!window.filteredOpportunities || !Array.isArray(window.filteredOpportunities)) {
            if (window.displayTradeOpportunities) {
                window.displayTradeOpportunities([]);
            }
            return;
        }
        const tradesToShow = window.filteredOpportunities.slice(startIndex, endIndex);
        if (window.displayTradeOpportunities) {
            window.displayTradeOpportunities(tradesToShow);
        }
        await updatePaginationControls();
        if (window.fetchUsernamesForCurrentPage) {
            window.fetchUsernamesForCurrentPage().catch(() => {});
        }
        const userStatsToggle = document.getElementById('user-stats-toggle');
        if (userStatsToggle && userStatsToggle.checked) {
            setTimeout(() => {
                if (window.loadCurrentUserStats) {
                    window.loadCurrentUserStats();
                }
            }, 100);
        }
    }
    function displayCurrentPage() {
        return new Promise((resolve) => {
            _displayWaiters.push(resolve);
            if (_displayTimer) clearTimeout(_displayTimer);
            const elapsed = Date.now() - _lastDisplayAt;
            const delay = elapsed > 1500 ? 50 : 600;
            _displayTimer = setTimeout(() => {
                _displayTimer = null;
                _lastDisplayAt = Date.now();
                const waiters = _displayWaiters;
                _displayWaiters = [];
                _doDisplayCurrentPage()
                    .then(() => waiters.forEach((w) => w()))
                    .catch(() => waiters.forEach((w) => w()));
            }, delay);
        });
    }
    window.Pagination = {
        getCurrentPage: getCurrentPage,
        setCurrentPage: setCurrentPage,
        getTradesPerPage: getTradesPerPage,
        getTotalPages: getTotalPages,
        updatePaginationControls: updatePaginationControls,
        displayCurrentPage: displayCurrentPage,
    };
})();
