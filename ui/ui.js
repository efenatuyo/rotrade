(function() {
    'use strict';

    function replacePageContent(newContent) {
        let contentContainer = document.querySelector('.container-main .row-fluid') ||
                              document.querySelector('#wrap .row-fluid') ||
                              document.querySelector('.content-container') ||
                              document.querySelector('.container-main');

        if (!contentContainer) {
            contentContainer = document.querySelector('#wrap') || document.querySelector('.container-main');
        }

        if (contentContainer) {
            const contentElements = contentContainer.querySelectorAll(':scope > *:not(.auto-trades-injected)');
            contentElements.forEach(el => {
                el.style.display = 'none';
            });
        }

        const existing = document.querySelector('.auto-trades-injected');
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'auto-trades-injected';
        wrapper.innerHTML = newContent;

        if (contentContainer) {
            contentContainer.appendChild(wrapper);
        } else {
            document.body.appendChild(wrapper);
        }
    }

    window.UI = {
        replacePageContent
    };
})();
