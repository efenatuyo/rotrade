(function () {
    'use strict';
    function shuffleOwnersArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    async function buildOpportunitiesFromPoolForTrade(trade) {
        const rolimonData = window.rolimonData || {};
        const realApiOwners = window.tradeRealOwners?.[trade.id] || [];
        if (realApiOwners.length === 0) {
            return [];
        }
        const maxTrades = trade.settings?.maxTrades || trade.settings?.maxTradesPerDay || 5;
        const tradesExecutedToday = Trades.getTodayTradeCount(trade.id);
        const remainingTrades = maxTrades - tradesExecutedToday;
        if (remainingTrades <= 0) {
            return [];
        }
        const yourIds = window.getItemIdsFromTrade
            ? await window.getItemIdsFromTrade(trade.giving, rolimonData)
            : [];
        const theirIds = window.getItemIdsFromTrade
            ? await window.getItemIdsFromTrade(trade.receiving, rolimonData)
            : [];
        const itemIds = trade.itemIds && trade.itemIds.length > 0 ? trade.itemIds : theirIds;
        const yourR = trade.robuxGive || 0;
        const theirR = trade.robuxGet || 0;
        const storedSentTrades = Storage.getAccount('sentTrades', []);
        if (storedSentTrades && Array.isArray(storedSentTrades)) {
            window.sentTrades = new Set(storedSentTrades.map((key) => String(key)));
        } else if (!window.sentTrades) {
            window.sentTrades = new Set();
        }
        const storedPrivacy = Storage.getAccount('privacyRestrictedUsers', []);
        if (storedPrivacy && Array.isArray(storedPrivacy)) {
            window.privacyRestrictedUsers = new Set(storedPrivacy.map((id) => String(id)));
        } else if (!window.privacyRestrictedUsers) {
            window.privacyRestrictedUsers = new Set();
        }
        const freshOwners = [];
        for (const userId of realApiOwners) {
            const tradeKey = `${String(trade.id)}-${String(userId)}`;
            const isOldDuplicate = window.sentTrades.has(tradeKey);
            const isHashDuplicate = await Trades.isTradeComboSentRecently(
                userId,
                yourIds,
                theirIds,
                yourR,
                theirR
            );
            const isPrivacyRestricted = window.privacyRestrictedUsers.has(String(userId));
            if (!isOldDuplicate && !isHashDuplicate && !isPrivacyRestricted) {
                freshOwners.push(userId);
            }
        }
        const shuffledFreshOwners = shuffleOwnersArray(freshOwners);
        const cap = Math.min(remainingTrades, shuffledFreshOwners.length);
        const ownersToShow = shuffledFreshOwners.slice(0, cap);
        return ownersToShow.map((userId, index) => ({
            ...trade,
            targetUserId: userId,
            targetUser: {
                id: userId,
                username: `Loading...`,
                displayName: `User${userId}`,
                avatarUrl: ``,
            },
            tradeKey: `${String(trade.id)}-${String(userId)}`,
            status: 'available',
            opportunityIndex: index + 1,
            itemIds: itemIds,
        }));
    }
    async function finalizeShuffleAndDisplay() {
        Pagination.setCurrentPage(1);
        await Pagination.displayCurrentPage().catch(() => {});
        if (window.updateTradeFilterBar) window.updateTradeFilterBar();
        if (window.updateTotalUsersInfo) window.updateTotalUsersInfo();
        Pagination.updatePaginationControls().catch(() => {});
    }
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
        if (tradeName === 'all') {
            const autoTrades = Storage.getAccount('autoTrades', []);
            if (!autoTrades || autoTrades.length === 0) {
                Dialogs.alert(
                    'No Opportunities',
                    'No trading opportunities available to shuffle.',
                    'info'
                );
                return;
            }
            let combined = [];
            for (let i = 0; i < autoTrades.length; i++) {
                const opps = await buildOpportunitiesFromPoolForTrade(autoTrades[i]);
                combined = combined.concat(opps);
            }
            if (combined.length === 0) {
                Dialogs.alert(
                    'No Opportunities',
                    'No trading opportunities available to shuffle.',
                    'info'
                );
                return;
            }
            let finalList = combined;
            if (window.fetchRealUsernames) {
                finalList = await window.fetchRealUsernames(combined);
            }
            window.currentOpportunities = finalList;
            if (window.applyActiveSendTradesFilter) {
                window.applyActiveSendTradesFilter();
            } else {
                window.filteredOpportunities = [...finalList];
            }
            await finalizeShuffleAndDisplay();
            return;
        }
        const activeTradeId = activeFilter ? activeFilter.dataset.tradeId : null;
        const autoTrades = Storage.getAccount('autoTrades', []);
        const currentTrade = autoTrades.find((t) => t.id == activeTradeId);
        if (!currentTrade) return;
        const realApiOwners = window.tradeRealOwners?.[currentTrade.id] || [];
        if (realApiOwners.length === 0) {
            Dialogs.alert('No Owners Found', 'No owners found to shuffle.', 'info');
            return;
        }
        let newForTrade = await buildOpportunitiesFromPoolForTrade(currentTrade);
        if (newForTrade.length > 0 && window.fetchRealUsernames) {
            newForTrade = await window.fetchRealUsernames(newForTrade);
        }
        const otherTrades = (window.currentOpportunities || []).filter(
            (opp) => String(opp.id) !== String(currentTrade.id)
        );
        window.currentOpportunities = [...otherTrades, ...newForTrade];
        if (window.applyActiveSendTradesFilter) {
            window.applyActiveSendTradesFilter();
        } else {
            window.filteredOpportunities = [...window.currentOpportunities];
        }
        await finalizeShuffleAndDisplay();
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
    }
    window.OpportunitiesShuffle = {
        setupShuffleSystem: setupShuffleSystem,
        shuffleUsers: shuffleUsers,
        buildOpportunitiesFromPoolForTrade: buildOpportunitiesFromPoolForTrade,
    };
    window.setupShuffleSystem = setupShuffleSystem;
    window.shuffleUsers = shuffleUsers;
})();
