(function() {
    'use strict';

    function getLanguagePrefix() {
        const pathname = window.location.pathname;
        const match = pathname.match(/^\/([a-z]{2})\//);
        return match ? `/${match[1]}` : '';
    }

    function buildPath(path) {
        const langPrefix = getLanguagePrefix();
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return langPrefix + cleanPath;
    }

    window.PagesUtils = {
        getLanguagePrefix,
        buildPath
    };

    if (!window.sanitizeHtml && window.SecurityUtils) {
        window.sanitizeHtml = window.SecurityUtils.sanitizeHtml;
    }

})();