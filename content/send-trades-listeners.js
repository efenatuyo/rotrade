(function() {
    'use strict';

    function setupSendTradesEventListeners() {
        const backBtn = document.querySelector('.back-link');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();

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

                if (window.cachedAngularService) {
                    window.cachedAngularService = null;
                }

                sessionStorage.removeItem('loadSendTrades');
                window.location.href = '/auto-trades';
            });
        }

        const userStatsToggle = document.getElementById('user-stats-toggle');
        if (userStatsToggle) {
            userStatsToggle.addEventListener('change', toggleUserStatsVisibility);
        }

        const prevBtn = document.getElementById('pagination-prev');
        const nextBtn = document.getElementById('pagination-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const currentPage = window.getCurrentPage();
                if (currentPage > 1) {
                    window.setCurrentPage(currentPage - 1);
                    window.displayCurrentPage();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const currentPage = window.getCurrentPage();
                const totalPages = window.getTotalPages();
                if (currentPage < totalPages) {
                    window.setCurrentPage(currentPage + 1);
                    window.displayCurrentPage();
                }
            });
        }
    }

    window.setupSendTradesEventListeners = setupSendTradesEventListeners;

})();