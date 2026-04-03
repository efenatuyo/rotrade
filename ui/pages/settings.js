(function () {
    'use strict';
    function loadSettingsPage() {
        const dest =
            window.Routing && window.Routing.buildPath
                ? window.Routing.buildPath('/auto-trades')
                : '/auto-trades';
        window.location.replace(dest);
    }
    window.PagesSettings = {
        loadSettingsPage: loadSettingsPage,
    };
    window.loadSettingsPage = loadSettingsPage;
})();
