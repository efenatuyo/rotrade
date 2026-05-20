(function () {
    'use strict';

    const TWOFA_EXPIRED_STREAK_KEY = '2fa_secret_expired_streak_';
    const TWOFA_EXPIRED_STREAK_THRESHOLD = 3;

    async function resetTwoFaExpiredStreak(userId) {
        if (!userId || !window.Storage) {
            return;
        }
        try {
            await window.Storage.remove(TWOFA_EXPIRED_STREAK_KEY + userId);
        } catch {}
    }

    async function incrementTwoFaExpiredStreak(userId) {
        if (!userId || !window.Storage) {
            return 1;
        }
        try {
            const key = TWOFA_EXPIRED_STREAK_KEY + userId;
            const prev = await window.Storage.get(key, 0);
            const n =
                (typeof prev === 'number' && !isNaN(prev) ? prev : parseInt(prev, 10) || 0) + 1;
            await window.Storage.set(key, n);
            return n;
        } catch {
            return 1;
        }
    }

    window.AutoConfirmerTwoFaStreak = {
        resetTwoFaExpiredStreak: resetTwoFaExpiredStreak,
        incrementTwoFaExpiredStreak: incrementTwoFaExpiredStreak,
        TWOFA_EXPIRED_STREAK_KEY: TWOFA_EXPIRED_STREAK_KEY,
        TWOFA_EXPIRED_STREAK_THRESHOLD: TWOFA_EXPIRED_STREAK_THRESHOLD,
    };
})();
