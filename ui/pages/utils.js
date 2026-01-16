(function() {
    'use strict';

    function sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    window.PagesUtils = {
        sanitizeHtml
    };

    window.sanitizeHtml = sanitizeHtml;

})();