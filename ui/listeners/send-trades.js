(function() {
    'use strict';

    function setupSendTradesEventListeners() {
        const backBtn = document.querySelector('.back-link');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();

                window.cachedAngularService = null;

                const contentContainer = document.querySelector('#content');
                const customOverlay = document.querySelector('#custom-send-trades-overlay');

                if (contentContainer) {
                    Array.from(contentContainer.children).forEach(child => {
                        if (child.id !== 'custom-send-trades-overlay') {
                            child.style.visibility = 'visible';
                        }
                    });
                }

                if (customOverlay) {
                    customOverlay.remove();
                }

                sessionStorage.removeItem('loadSendTrades');
                const pathname = window.location.pathname;
                const langMatch = pathname.match(/^\/([a-z]{2})\//);
                const langPrefix = langMatch ? `/${langMatch[1]}` : '';
                window.location.href = langPrefix + '/auto-trades';
            });
        }

        const userStatsToggle = document.getElementById('user-stats-toggle');
        if (userStatsToggle) {
            userStatsToggle.addEventListener('change', () => {
                if (window.toggleUserStatsVisibility) {
                    window.toggleUserStatsVisibility();
                }
            });
        }

        const prevBtn = document.getElementById('pagination-prev');
        const nextBtn = document.getElementById('pagination-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const currentPage = Pagination.getCurrentPage();
                if (currentPage > 1) {
                    Pagination.setCurrentPage(currentPage - 1);
                    Pagination.displayCurrentPage();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const currentPage = Pagination.getCurrentPage();
                const totalPages = Pagination.getTotalPages();
                if (currentPage < totalPages) {
                    Pagination.setCurrentPage(currentPage + 1);
                    Pagination.displayCurrentPage();
                }
            });
        }
    }

    window.EventListenersSendTrades = {
        setupSendTradesEventListeners
    };

    window.setupSendTradesEventListeners = setupSendTradesEventListeners;

})();