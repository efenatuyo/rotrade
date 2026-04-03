(function () {
    'use strict';
    async function fetchRealUsernames(opportunities) {
        const userIds = [...new Set(opportunities.map((opp) => opp.targetUserId))];
        const batches = [];
        for (let i = 0; i < userIds.length; i += 100) {
            batches.push(userIds.slice(i, i + 100));
        }
        for (const batch of batches) {
            try {
                const response = await fetch(`https://users.roblox.com/v1/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userIds: batch,
                        excludeBannedUsers: true,
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    data.data.forEach((user) => {
                        opportunities.forEach((opp) => {
                            if (opp.targetUserId === user.id) {
                                opp.targetUser.username = user.name;
                                opp.targetUser.displayName = user.displayName || user.name;
                            }
                        });
                    });
                }
            } catch (error) {}
        }
        return opportunities;
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
        loadUserAvatars: loadUserAvatars,
    };
    window.fetchRealUsernames = fetchRealUsernames;
    window.loadUserAvatars = loadUserAvatars;
})();
