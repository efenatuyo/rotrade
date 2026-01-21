(function() {
    'use strict';

    function setupShuffleSystem() {
        const shuffleBtn = document.getElementById('shuffle-users-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                shuffleUsers();
            });
        }
    }

    async function shuffleUsers() {
        const activeFilter = document.querySelector('.trade-filter-chip.active');
        const tradeName = activeFilter ? activeFilter.dataset.tradeName : 'all';

        // Handle "all trades" shuffle - just shuffle all current opportunities
        if (tradeName === 'all') {
            if (!window.currentOpportunities || window.currentOpportunities.length === 0) {
                Dialogs.alert('No Opportunities', 'No trading opportunities available to shuffle.', 'info');
                return;
            }

            // Shuffle all opportunities
            function shuffleArray(array) {
                const shuffled = [...array];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
            }

            const shuffled = shuffleArray([...window.currentOpportunities]);
            window.currentOpportunities = shuffled;
            // Since "all trades" is active, filteredOpportunities should show all opportunities
            window.filteredOpportunities = [...shuffled];

            Pagination.setCurrentPage(1);
            Pagination.displayCurrentPage();
            if (window.updateTradeFilterBar) window.updateTradeFilterBar();
            if (window.updateTotalUsersInfo) window.updateTotalUsersInfo();
            Pagination.updatePaginationControls();
            
            Utils.delay(50).then(() => {
                if (window.loadUserAvatars) window.loadUserAvatars();
            });

            return;
        }

        // Handle specific trade shuffle
        const activeTradeId = activeFilter ? activeFilter.dataset.tradeId : null;
        const autoTrades = Storage.getAccount('autoTrades', []);
        const currentTrade = autoTrades.find(t => t.id == activeTradeId);

        if (!currentTrade) return;

        const rolimonData = window.rolimonData || {};
        const yourIds = window.getItemIdsFromTrade ? await window.getItemIdsFromTrade(currentTrade.giving, rolimonData) : [];
        const theirIds = window.getItemIdsFromTrade ? await window.getItemIdsFromTrade(currentTrade.receiving, rolimonData) : [];
        const yourR = currentTrade.robuxGive || 0;
        const theirR = currentTrade.robuxGet || 0;

        const realApiOwners = window.tradeRealOwners?.[currentTrade.id] || [];

        if (realApiOwners.length === 0) {
            Dialogs.alert('No Owners Found', 'No owners found to shuffle.', 'info');
            return;
        }

        const oldSentTrades = new Set(Storage.getAccount('sentTrades', []));
        const history = Storage.getAccount('sentTradeHistory', []);
        const settings = Trades.getSettings();
        const now = Date.now();
        const expiryMs = settings.tradeMemoryDays * 24 * 60 * 60 * 1000;
        
        const validHistory = history.filter(entry => (now - entry.timestamp) < expiryMs);

        const freshOwners = [];

        for (const userId of realApiOwners) {
            const tradeKey = `${currentTrade.id}-${userId}`;
            const isOldDuplicate = oldSentTrades.has(tradeKey);

            const currentHash = await Trades.generateTradeHash(yourIds, theirIds, yourR, theirR);
            const isHashDuplicate = validHistory.some(entry => entry.userId === userId && entry.hash === currentHash);

            if (!isOldDuplicate && !isHashDuplicate) {
                freshOwners.push(userId);
            }
        }

        const shuffledFreshOwners = [...freshOwners].sort(() => Math.random() - 0.5);
        let newOpportunities = [];
        
        const maxTrades = currentTrade.settings?.maxTrades || currentTrade.settings?.maxTradesPerDay || 5;
        const tradesExecutedToday = Trades.getTodayTradeCount(currentTrade.id);
        const remainingTrades = maxTrades - tradesExecutedToday;

        if (remainingTrades > 0) {
            const ownersToShow = shuffledFreshOwners.slice(0, remainingTrades);

            ownersToShow.forEach((userId, index) => {
                newOpportunities.push({
                    ...currentTrade,
                    targetUserId: userId,
                    targetUser: {
                        id: userId,
                        username: `Loading...`,
                        displayName: `User${userId}`,
                        avatarUrl: ``
                    },
                    tradeKey: `${currentTrade.id}-${userId}`,
                    status: 'available',
                    opportunityIndex: index + 1,
                    itemIds: currentTrade.itemIds || []
                });
            });
        }

        if (newOpportunities.length > 0 && window.fetchRealUsernames) {
            newOpportunities = await window.fetchRealUsernames(newOpportunities);
        }

        window.currentOpportunities = newOpportunities;
        window.filteredOpportunities = [...window.currentOpportunities];

        Pagination.setCurrentPage(1);
        Pagination.displayCurrentPage();
        if (window.updateTradeFilterBar) window.updateTradeFilterBar();
        if (window.updateTotalUsersInfo) window.updateTotalUsersInfo();
        Pagination.updatePaginationControls();
        if (window.loadUserAvatars) window.loadUserAvatars();

        Utils.delay(50).then(() => {
            const filterChips = document.querySelectorAll('.trade-filter-chip');
            for (let i = 0; i < filterChips.length; i++) {
                const chip = filterChips[i];
                chip.classList.remove('active');
                chip.style.borderBottom = '';
                chip.style.setProperty('border-bottom', 'none', 'important');

                if (chip.dataset.tradeId === activeTradeId) {
                    chip.classList.add('active');
                    chip.style.setProperty('border-bottom', '3px solid white', 'important');
                }
            }
        });

        Utils.nextFrame(() => {
            if (window.loadUserAvatars) window.loadUserAvatars();
        });
    }

    window.OpportunitiesShuffle = {
        setupShuffleSystem,
        shuffleUsers
    };

    window.setupShuffleSystem = setupShuffleSystem;
    window.shuffleUsers = shuffleUsers;

})();