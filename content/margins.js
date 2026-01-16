(function() {
    'use strict';

    function updateContainerMargins() {
        const sidebarWrapper = document.querySelector('.simplebar-content-wrapper');
        const leftColList = document.querySelector('.left-col-list');
        
        const isSidebarVisible = sidebarWrapper && leftColList && 
                                 window.getComputedStyle(sidebarWrapper).display !== 'none' &&
                                 window.getComputedStyle(leftColList).display !== 'none' &&
                                 leftColList.offsetWidth > 0 &&
                                 leftColList.children.length > 0;
        
        const containers = document.querySelectorAll('.auto-trades-injected .auto-trades-container, .auto-trades-injected .create-trade-container');
        
        containers.forEach(container => {
            if (isSidebarVisible) {
                container.classList.remove('sidebar-collapsed');
            } else {
                container.classList.add('sidebar-collapsed');
            }
        });
    }

    function initMarginObserver() {
        setTimeout(updateContainerMargins, 100);

        const sidebarObserver = new MutationObserver(() => {
            setTimeout(updateContainerMargins, 50);
        });

        if (document.body) {
            sidebarObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }

        window.addEventListener('resize', () => {
            setTimeout(updateContainerMargins, 100);
        });

        setInterval(updateContainerMargins, 1000);
    }

    window.ContentMargins = {
        updateContainerMargins,
        initMarginObserver
    };

})();