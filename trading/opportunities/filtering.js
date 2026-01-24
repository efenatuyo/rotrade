(function() {
    'use strict';

    function setupTradeFiltering() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('trade-filter-chip')) {
                const tradeId = e.target.dataset.tradeId;
                const tradeName = e.target.dataset.tradeName;

                document.querySelectorAll('.trade-filter-chip').forEach(chip => {
                    chip.classList.remove('active');
                    chip.style.borderBottom = '';
                    chip.style.setProperty('border-bottom', 'none', 'important');
                });

                e.target.classList.add('active');
                e.target.style.setProperty('border-bottom', '3px solid white', 'important');

                const storedSentTrades = Storage.getAccount('sentTrades', []);
                if (storedSentTrades && Array.isArray(storedSentTrades)) {
                    window.sentTrades = new Set(storedSentTrades.map(key => String(key)));
                } else if (!window.sentTrades) {
                    window.sentTrades = new Set();
                }

                const storedPrivacyRestricted = Storage.getAccount('privacyRestrictedUsers', []);
                if (storedPrivacyRestricted && Array.isArray(storedPrivacyRestricted)) {
                    window.privacyRestrictedUsers = new Set(storedPrivacyRestricted.map(id => String(id)));
                } else if (!window.privacyRestrictedUsers) {
                    window.privacyRestrictedUsers = new Set();
                }

                let filtered = window.currentOpportunities;
                if (tradeName !== 'all') {
                    filtered = window.currentOpportunities.filter(opp => opp.id == tradeId);
                }

                filtered = filtered.filter(opp => {
                    if (!opp || !opp.tradeKey) return true;
                    const isSent = window.sentTrades.has(opp.tradeKey);
                    const isRestricted = window.privacyRestrictedUsers.has(String(opp.targetUserId));
                    return !isSent && !isRestricted;
                });

                window.filteredOpportunities = filtered;

                Pagination.setCurrentPage(1);
                Pagination.displayCurrentPage();
                if (window.updateTotalUsersInfo) window.updateTotalUsersInfo();
                Pagination.updatePaginationControls();
                if (window.loadUserAvatars) {
                    window.loadUserAvatars();
                    Utils.nextFrame(() => {
                        window.loadUserAvatars();
                    });
                }
            }
        });
    }

    function updateTradeFilterBar() {
        const filterChips = document.getElementById('trade-filter-chips');
        if (!filterChips) return;

        const currentActiveChip = document.querySelector('.trade-filter-chip.active');
        const currentActiveTab = currentActiveChip ? currentActiveChip.dataset.tradeName : 'all';

        const autoTrades = Storage.getAccount('autoTrades', []);

        const allCount = window.currentOpportunities ? window.currentOpportunities.length : 0;
        const allActive = currentActiveTab === 'all' ? 'active' : '';
        let chipsHtml = `<div class="trade-filter-chip ${allActive}" data-trade-name="all">
            All Trades <span class="trade-count-badge">${allCount}</span>
        </div>`;

        autoTrades.forEach(trade => {
            const tradeOpps = window.currentOpportunities ? window.currentOpportunities.filter(opp => opp.id == trade.id) : [];
            const currentlyShowing = tradeOpps.length;

            const totalApiOwners = trade.totalOwners || 0;
            const maxTrades = trade.settings?.maxTrades || 5;
            const tradesExecutedToday = Trades.getTodayTradeCount(trade.id);
            const remainingTrades = Math.max(0, maxTrades - tradesExecutedToday);

            let statusText;
            if (totalApiOwners === 0) {
                statusText = remainingTrades === 0 ? "Daily limit reached" : "No owners found";
            } else {
                statusText = `${currentlyShowing}/${totalApiOwners}`;
            }

            const tradeActive = currentActiveTab === trade.name ? 'active' : '';
            chipsHtml += `<div class="trade-filter-chip ${tradeActive}" data-trade-id="${trade.id}" data-trade-name="${trade.name}">
                ${trade.name} <span class="trade-count-badge">${statusText}</span>
            </div>`;
        });

        filterChips.innerHTML = chipsHtml;
    }

    function updateTotalUsersInfo() {
        const totalInfo = document.getElementById('total-users-info');
        if (!totalInfo) return;

        const totalShowing = window.filteredOpportunities ? window.filteredOpportunities.length : 0;
        const totalAvailable = window.currentOpportunities ? window.currentOpportunities.length : 0;

        totalInfo.textContent = `Showing: ${totalShowing} / ${totalAvailable} opportunities`;
    }

    window.OpportunitiesFiltering = {
        setupTradeFiltering,
        updateTradeFilterBar,
        updateTotalUsersInfo
    };

    window.setupTradeFiltering = setupTradeFiltering;
    window.updateTradeFilterBar = updateTradeFilterBar;
    window.updateTotalUsersInfo = updateTotalUsersInfo;

})();