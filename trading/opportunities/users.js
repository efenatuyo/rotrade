(function () {
    'use strict';
    if (!window._usernameCache) window._usernameCache = new Map();
    if (!window._usernameInFlight) window._usernameInFlight = new Map();
    function applyUsernameToDom(userId, name) {
        if (!name) return;
        const key = String(userId);
        const buttons = document.querySelectorAll(
            `.send-trade-btn[data-user-id="${CSS.escape(key)}"]`
        );
        for (const btn of buttons) {
            const card = btn.closest('.send-trade-card');
            if (!card) continue;
            const target = card.querySelector('.trade-target');
            if (target) {
                target.textContent = `→ ${name}`;
            }
            const avatar = card.querySelector('.user-avatar-compact');
            if (avatar) {
                avatar.alt = name;
            }
        }
    }
    async function fetchUsernamesFromPage(userIds) {
        if (!Array.isArray(userIds) || userIds.length === 0) return [];
        if (!window.BridgeUtils || !window.BridgeUtils.callBridgeMethod) return [];
        try {
            const result = await window.BridgeUtils.callBridgeMethod(
                'fetchUsernames',
                { userIds: userIds },
                15000
            );
            return Array.isArray(result) ? result : [];
        } catch (e) {
            return [];
        }
    }
    async function fetchRealUsernames(opportunities) {
        if (!Array.isArray(opportunities) || opportunities.length === 0) return opportunities;
        const oppsByUserId = new Map();
        const idsToFetch = [];
        for (const opp of opportunities) {
            const n = Number(opp.targetUserId);
            if (!Number.isFinite(n) || n <= 0) continue;
            const key = String(n);
            if (!oppsByUserId.has(key)) oppsByUserId.set(key, []);
            oppsByUserId.get(key).push(opp);
            const cached = window._usernameCache.get(key);
            if (cached) {
                if (opp.targetUser) {
                    opp.targetUser.username = cached.name;
                    opp.targetUser.displayName = cached.displayName || cached.name;
                }
                applyUsernameToDom(key, cached.name);
            } else if (!window._usernameInFlight.has(key)) {
                idsToFetch.push(n);
            }
        }
        if (idsToFetch.length === 0) return opportunities;
        const fetchPromise = fetchUsernamesFromPage(idsToFetch);
        for (const id of idsToFetch) {
            window._usernameInFlight.set(String(id), fetchPromise);
        }
        let users = [];
        try {
            users = await fetchPromise;
        } finally {
            for (const id of idsToFetch) {
                window._usernameInFlight.delete(String(id));
            }
        }
        for (const user of users) {
            const key = String(user.id);
            window._usernameCache.set(key, {
                name: user.name,
                displayName: user.displayName || user.name,
            });
            const matchingOpps = oppsByUserId.get(key);
            if (matchingOpps) {
                for (const opp of matchingOpps) {
                    if (!opp.targetUser) opp.targetUser = { id: user.id };
                    opp.targetUser.username = user.name;
                    opp.targetUser.displayName = user.displayName || user.name;
                }
            }
            applyUsernameToDom(key, user.name);
        }
        return opportunities;
    }
    async function fetchUsernamesForCurrentPage() {
        if (!Array.isArray(window.filteredOpportunities)) return;
        const tradesPerPage =
            (window.Pagination && window.Pagination.getTradesPerPage
                ? window.Pagination.getTradesPerPage()
                : 9) || 9;
        const currentPage =
            window.Pagination && window.Pagination.getCurrentPage
                ? await window.Pagination.getCurrentPage()
                : 1;
        const start = (currentPage - 1) * tradesPerPage;
        const end = start + tradesPerPage;
        const visible = window.filteredOpportunities.slice(start, end);
        if (visible.length > 0) {
            await fetchRealUsernames(visible);
        }
    }
    let _avatarDebounceTimer = null;
    async function runAvatarHeadshotFetch() {
        const sendButtons = document.querySelectorAll('.send-trade-btn');
        if (sendButtons.length === 0) {
            return;
        }
        const userIds = [
            ...new Set(
                Array.from(sendButtons)
                    .map((btn) => btn.getAttribute('data-user-id'))
                    .filter(Boolean)
            ),
        ];
        if (userIds.length === 0) {
            return;
        }
        try {
            const response = await fetch(
                `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join(',')}&size=150x150&format=Png&isCircular=false`
            );
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    const avatarMap = new Map();
                    data.data.forEach((userData) => {
                        if (userData.state === 'Completed' && userData.imageUrl) {
                            avatarMap.set(userData.targetId.toString(), userData.imageUrl);
                        }
                    });
                    document.querySelectorAll('.send-trade-btn').forEach((button) => {
                        const userId = button.getAttribute('data-user-id');
                        const card = button.closest('.send-trade-card');
                        if (card && avatarMap.has(userId)) {
                            const avatarImg = card.querySelector('.user-avatar-compact');
                            if (avatarImg) {
                                avatarImg.src = avatarMap.get(userId);
                                avatarImg.style.opacity = '1';
                            }
                        }
                    });
                }
            }
        } catch (error) {}
    }
    function loadUserAvatars() {
        if (_avatarDebounceTimer !== null) {
            clearTimeout(_avatarDebounceTimer);
        }
        _avatarDebounceTimer = setTimeout(() => {
            _avatarDebounceTimer = null;
            void runAvatarHeadshotFetch();
        }, 120);
    }
    window.OpportunitiesUsers = {
        fetchRealUsernames: fetchRealUsernames,
        fetchUsernamesForCurrentPage: fetchUsernamesForCurrentPage,
        loadUserAvatars: loadUserAvatars,
    };
    window.fetchRealUsernames = fetchRealUsernames;
    window.fetchUsernamesForCurrentPage = fetchUsernamesForCurrentPage;
    window.loadUserAvatars = loadUserAvatars;
})();
