(function() {
    'use strict';

    window.PagesUtils = {};

    if (!window.sanitizeHtml && window.SecurityUtils) {
        window.sanitizeHtml = window.SecurityUtils.sanitizeHtml;
    }

})();