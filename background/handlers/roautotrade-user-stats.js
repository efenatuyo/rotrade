function handleFetchRolautotradeUserStats(request, sendResponse) {
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
    const url = 'https://roautotrade.com/api/rolimons/user_stats/' + encodeURIComponent(userId);
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

function handleFetchRolautotradeUserPreferences(request, sendResponse) {
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
    const url =
        'https://roautotrade.com/api/rolimons/user_prefrences/' + encodeURIComponent(userId);
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
