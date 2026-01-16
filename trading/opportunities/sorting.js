(function() {
    'use strict';

    function setupSortingSystem() {
        const sortTypeSelect = document.getElementById('sort-type');
        const sortOrderSelect = document.getElementById('sort-order');

        if (!sortTypeSelect || !sortOrderSelect) return;

        applySort();

        sortTypeSelect.addEventListener('change', applySort);
        sortOrderSelect.addEventListener('change', applySort);
    }

    function applySort() {
        const sortType = document.getElementById('sort-type')?.value || 'ownerSince';
        const sortOrder = document.getElementById('sort-order')?.value || 'asc';

        if (!window.filteredOpportunities || window.filteredOpportunities.length === 0) return;

        window.filteredOpportunities.sort((a, b) => {
            const rawDataA = window.ownersRawData && window.ownersRawData[a.id]?.find(u => u.userId === a.targetUserId);
            const rawDataB = window.ownersRawData && window.ownersRawData[b.id]?.find(u => u.userId === b.targetUserId);

            let valA = 0;
            let valB = 0;

            if (sortType === 'ownerSince') {
                valA = rawDataA ? rawDataA.ownedSince : 0;
                valB = rawDataB ? rawDataB.ownedSince : 0;
            } else if (sortType === 'lastOnline') {
                valA = rawDataA ? rawDataA.lastOnline : 0;
                valB = rawDataB ? rawDataB.lastOnline : 0;
            }

            if (sortOrder === 'asc') {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });

        Pagination.setCurrentPage(1);
        Pagination.displayCurrentPage();
        Pagination.updatePaginationControls();
    }

    window.OpportunitiesSorting = {
        setupSortingSystem,
        applySort
    };

    window.setupSortingSystem = setupSortingSystem;
    window.applySort = applySort;

})();