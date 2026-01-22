(function() {
    'use strict';

    function detectAndApplyTheme() {
        return Routing.detectAndApplyTheme();
    }

    function addAutoTradesTab() {
        return Routing.addAutoTradesTab();
    }

    function handleRouting() {
        return Routing.handleRouting();
    }

    function getSettings() {
        return Trades.getSettings();
    }

    window.detectAndApplyTheme = detectAndApplyTheme;
    window.addAutoTradesTab = addAutoTradesTab;
    window.handleRouting = handleRouting;
    window.getSettings = getSettings;

    document.addEventListener('click', function(e) {
        if (e.target.closest('#nav-auto-trades')) {
            e.preventDefault();
            const langPrefix = window.Routing ? window.Routing.getLanguagePrefix() : '';
            window.location.href = (langPrefix || '') + '/auto-trades';
        }
    });

    window.addEventListener('popstate', handleRouting);
    window.addEventListener('hashchange', handleRouting);

})();