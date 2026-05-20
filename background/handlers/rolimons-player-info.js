const rolimonsPlayerInfoCache = new Map();
const ROLIMONS_PLAYER_INFO_TTL_MS = 5 * 60 * 1000;

function handleFetchRolimonsPlayerInfo(request, sendResponse) {
    const rawId = request.userId;
    const userId =
        typeof rawId === 'string'
            ? rawId.trim()
            : rawId != null && typeof rawId === 'number'
              ? String(rawId)
              : '';
    if (!userId || !/^\d+$/.test(userId)) {
        sendResponse({
            success: false,
            error: 'invalid_user_id',
        });
        return false;
    }
    const cached = rolimonsPlayerInfoCache.get(userId);
    const now = Date.now();
    if (cached && now - cached.ts < ROLIMONS_PLAYER_INFO_TTL_MS) {
        sendResponse({
            success: true,
            data: cached.data,
        });
        return false;
    }
    const url = 'https://api.rolimons.com/players/v1/playerinfo/' + encodeURIComponent(userId);
    fetch(url, {
        credentials: 'omit',
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            rolimonsPlayerInfoCache.set(userId, {
                ts: Date.now(),
                data: data,
            });
            sendResponse({
                success: true,
                data: data,
            });
        })
        .catch(function (err) {
            sendResponse({
                success: false,
                error: err && err.message ? err.message : 'fetch_failed',
            });
        });
    return true;
}
