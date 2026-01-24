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
                const path = window.Routing ? window.Routing.buildPath('/auto-trades') : '/auto-trades';
                window.location.href = path;
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

        const setupPaginationButtons = () => {
            const prevBtn = document.getElementById('pagination-prev');
            const nextBtn = document.getElementById('pagination-next');

            if (prevBtn) {
                if (prevBtn._handlerAttached && prevBtn._clickHandler) {
                    prevBtn.removeEventListener('click', prevBtn._clickHandler);
                }
                prevBtn._clickHandler = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (prevBtn.disabled) {
                        return;
                    }
                    const currentPage = await Pagination.getCurrentPage();
                    if (currentPage > 1) {
                        Pagination.setCurrentPage(currentPage - 1);
                        await Pagination.displayCurrentPage();
                    }
                };
                prevBtn.addEventListener('click', prevBtn._clickHandler);
                prevBtn.onclick = prevBtn._clickHandler;
                prevBtn._handlerAttached = true;
            }

            if (nextBtn) {
                if (nextBtn._handlerAttached && nextBtn._clickHandler) {
                    nextBtn.removeEventListener('click', nextBtn._clickHandler);
                }
                nextBtn._clickHandler = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (nextBtn.disabled) {
                        return;
                    }
                    const currentPage = await Pagination.getCurrentPage();
                    const totalPages = Pagination.getTotalPages();
                    if (currentPage < totalPages) {
                        Pagination.setCurrentPage(currentPage + 1);
                        await Pagination.displayCurrentPage();
                    }
                };
                nextBtn.addEventListener('click', nextBtn._clickHandler);
                nextBtn.onclick = nextBtn._clickHandler;
                nextBtn._handlerAttached = true;
            }
        };

        setupPaginationButtons();
        
        Utils.delay(100).then(() => {
            setupPaginationButtons();
        });
        
        Utils.delay(500).then(() => {
            setupPaginationButtons();
        });
        
        Utils.delay(1000).then(() => {
            setupPaginationButtons();
        });
        
        Utils.delay(2000).then(() => {
            setupPaginationButtons();
        });
        
        if (window.Pagination && window.Pagination.updatePaginationControls) {
            window.Pagination.updatePaginationControls().then(() => {
                setupPaginationButtons();
            });
        }
        
        const observer = new MutationObserver((mutations) => {
            const nextBtn = document.getElementById('pagination-next');
            const prevBtn = document.getElementById('pagination-prev');
            if ((nextBtn && !nextBtn._handlerAttached) || (prevBtn && !prevBtn._handlerAttached)) {
                setupPaginationButtons();
            }
        });
        
        const targetNode = document.getElementById('send-trades-grid') || document.body;
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
        }, 60000);
    }
    
    if (!window._paginationDocumentListenerAttached) {
        document.addEventListener('click', (e) => {
            const target = e.target;
            const isNextBtn = target && (target.id === 'pagination-next' || (target.closest && target.closest('#pagination-next')));
            const isPrevBtn = target && (target.id === 'pagination-prev' || (target.closest && target.closest('#pagination-prev')));
            
            if (isNextBtn) {
                e.preventDefault();
                e.stopPropagation();
                const nextBtn = document.getElementById('pagination-next');
                if (nextBtn && !nextBtn.disabled) {
                    if (nextBtn._clickHandler) {
                        nextBtn._clickHandler(e);
                    } else if (window.Pagination) {
                        window.Pagination.getCurrentPage().then(currentPage => {
                            const totalPages = window.Pagination.getTotalPages();
                            if (currentPage < totalPages) {
                                window.Pagination.setCurrentPage(currentPage + 1);
                                window.Pagination.displayCurrentPage();
                            }
                        });
                    }
                }
            }
            
            if (isPrevBtn) {
                e.preventDefault();
                e.stopPropagation();
                const prevBtn = document.getElementById('pagination-prev');
                if (prevBtn && !prevBtn.disabled) {
                    if (prevBtn._clickHandler) {
                        prevBtn._clickHandler(e);
                    } else if (window.Pagination) {
                        window.Pagination.getCurrentPage().then(currentPage => {
                            if (currentPage > 1) {
                                window.Pagination.setCurrentPage(currentPage - 1);
                                window.Pagination.displayCurrentPage();
                            }
                        });
                    }
                }
            }
        }, true);
        window._paginationDocumentListenerAttached = true;
    }

    window.EventListenersSendTrades = {
        setupSendTradesEventListeners
    };

    window.setupSendTradesEventListeners = setupSendTradesEventListeners;

})();