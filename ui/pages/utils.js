(function() {
    'use strict';

    function getLanguagePrefix() {
        return window.Routing ? window.Routing.getLanguagePrefix() : '';
    }

    function buildPath(path) {
        return window.Routing ? window.Routing.buildPath(path) : path;
    }

    window.PagesUtils = {
        getLanguagePrefix,
        buildPath
    };

    if (!window.sanitizeHtml && window.SecurityUtils) {
        window.sanitizeHtml = window.SecurityUtils.sanitizeHtml;
    }

})();