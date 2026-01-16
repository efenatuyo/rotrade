(function() {
    'use strict';

    function getCurrentPage() {
        return parseInt(Storage.get('tradesCurrentPage', '1'));
    }

    function setCurrentPage(page) {
        Storage.set('tradesCurrentPage', page.toString());
    }

    function getTradesPerPage() {
        return 9;
    }

    function getTotalPages() {
        const totalTrades = window.filteredOpportunities ? window.filteredOpportunities.length : 0;
        const tradesPerPage = getTradesPerPage();
        return Math.max(1, Math.ceil(totalTrades / tradesPerPage));
    }

    function updatePaginationControls() {
        const currentPage = getCurrentPage();
        const totalPages = getTotalPages();
        
        const currentSpan = DOM.$('#pagination-current');
        const totalSpan = DOM.$('#pagination-total-pages');
        const prevBtn = DOM.$('#pagination-prev');
        const nextBtn = DOM.$('#pagination-next');
        
        if (currentSpan) currentSpan.textContent = `Page ${currentPage}`;
        if (totalSpan) totalSpan.textContent = totalPages;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    function displayCurrentPage() {
        const container = DOM.$('#send-trades-grid');
        if (!container) return;

        const currentPage = getCurrentPage();
        const tradesPerPage = getTradesPerPage();
        const startIndex = (currentPage - 1) * tradesPerPage;
        const endIndex = startIndex + tradesPerPage;
        
        const tradesToShow = window.filteredOpportunities.slice(startIndex, endIndex);
        
        if (window.displayTradeOpportunities) {
            window.displayTradeOpportunities(tradesToShow);
        }
        updatePaginationControls();
        
        setTimeout(() => {
            if (window.loadUserAvatars) {
                window.loadUserAvatars();
            }
        }, 50);

        const userStatsToggle = document.getElementById('user-stats-toggle');
        if (userStatsToggle && userStatsToggle.checked) {
            setTimeout(() => {
                if (window.loadCurrentUserStats) {
                    window.loadCurrentUserStats();
                }
            }, 100);
        }
    }

    window.Pagination = {
        getCurrentPage,
        setCurrentPage,
        getTradesPerPage,
        getTotalPages,
        updatePaginationControls,
        displayCurrentPage
    };
})();
