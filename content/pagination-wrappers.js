(function() {
    'use strict';

    function getCurrentPage() {
        return Pagination.getCurrentPage();
    }

    function setCurrentPage(page) {
        Pagination.setCurrentPage(page);
    }

    function getTotalPages() {
        return Pagination.getTotalPages();
    }

    function displayCurrentPage() {
        Pagination.displayCurrentPage();
    }

    window.getCurrentPage = getCurrentPage;
    window.setCurrentPage = setCurrentPage;
    window.getTotalPages = getTotalPages;
    window.displayCurrentPage = displayCurrentPage;

})();