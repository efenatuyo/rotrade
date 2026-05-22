function handleFetchUserAuth(request, sendResponse) {
    (async () => {
        const result = await Utils.safeFetch('https://users.roblox.com/v1/users/authenticated', {
            timeout: 8e3,
            retries: 2,
        });
        if (result.ok) {
            const userData = result.data?.data || result.data;
            if (!userData || typeof userData !== 'object' || Array.isArray(userData)) {
                Utils.Logger.log('fetch_user_auth_validation_failed', {
                    errors: ['userData is not a valid object'],
                    resultData: result.data,
                    userData: userData,
                    userDataType: typeof userData,
                    isArray: Array.isArray(userData),
                });
                sendResponse({
                    success: false,
                    error: 'Invalid user data format: data is not an object',
                });
                return;
            }
            const validated = Utils.validateData(userData, {
                id: {
                    type: 'number',
                    required: true,
                },
                name: {
                    type: 'string',
                    required: true,
                },
                displayName: {
                    type: 'string',
                    required: true,
                },
            });
            if (validated.valid) {
                sendResponse({
                    success: true,
                    data: validated.data,
                });
            } else {
                Utils.Logger.log('fetch_user_auth_validation_failed', {
                    errors: validated.errors,
                    receivedData: userData,
                });
                sendResponse({
                    success: false,
                    error: 'Invalid user data format',
                });
            }
        } else {
            Utils.Logger.log('fetch_user_auth_failed', {
                error: result.error?.message,
            });
            sendResponse({
                success: false,
                error: result.error?.message || 'Failed to fetch user auth',
            });
        }
    })();
    return true;
}

let _bgUsersCsrfToken = null;

async function _bgFetchUsersCsrfToken() {
    try {
        const r = await fetch('https://auth.roblox.com/v1/logout', {
            method: 'POST',
            credentials: 'include',
        });
        const token = r.headers.get('x-csrf-token');
        if (token) _bgUsersCsrfToken = token;
        return token;
    } catch {
        return null;
    }
}

async function _bgPostUsersBatch(batch, csrfToken) {
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
    if (csrfToken) headers['X-CSRF-TOKEN'] = csrfToken;
    return fetch('https://users.roblox.com/v1/users', {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({
            userIds: batch,
            excludeBannedUsers: false,
        }),
    });
}

function handleFetchUsernamesBatch(request, sendResponse) {
    (async () => {
        const rawIds = Array.isArray(request.userIds) ? request.userIds : [];
        const userIds = [
            ...new Set(
                rawIds
                    .map((n) => (typeof n === 'number' ? n : parseInt(n)))
                    .filter((n) => Number.isFinite(n) && n > 0)
            ),
        ];
        if (userIds.length === 0) {
            sendResponse({ success: true, data: [] });
            return;
        }
        const batches = [];
        for (let i = 0; i < userIds.length; i += 100) {
            batches.push(userIds.slice(i, i + 100));
        }
        const all = [];
        for (const batch of batches) {
            try {
                let response = await _bgPostUsersBatch(batch, _bgUsersCsrfToken);
                if (response.status === 403) {
                    const fresh = response.headers.get('x-csrf-token');
                    if (fresh) {
                        _bgUsersCsrfToken = fresh;
                    } else {
                        await _bgFetchUsersCsrfToken();
                    }
                    if (_bgUsersCsrfToken) {
                        response = await _bgPostUsersBatch(batch, _bgUsersCsrfToken);
                    }
                }
                if (!response.ok) continue;
                const data = await response.json();
                if (Array.isArray(data?.data)) {
                    for (const u of data.data) {
                        all.push({
                            id: u.id,
                            name: u.name,
                            displayName: u.displayName || u.name,
                        });
                    }
                }
            } catch (e) {}
        }
        sendResponse({ success: true, data: all });
    })();
    return true;
}

function handleFetchUserInventory(request, sendResponse) {
    const cacheKey = `${request.userId}_${request.cursor || ''}`;
    const now = Date.now();
    const cached = inventoryCache.map.get(cacheKey);
    if (cached && now - cached.timestamp < inventoryCache.duration) {
        sendResponse({
            success: true,
            data: cached.data,
        });
        return true;
    }
    let url = `https://inventory.roblox.com/v1/users/${request.userId}/assets/collectibles?sortOrder=Asc&limit=100`;
    if (request.cursor) {
        url += `&cursor=${request.cursor}`;
    }
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then((data) => {
            inventoryCache.map.set(cacheKey, {
                data: data,
                timestamp: Date.now(),
            });
            sendResponse({
                success: true,
                data: data,
            });
        })
        .catch((error) => {
            sendResponse({
                success: false,
                error: error.message,
            });
        });
    return true;
}
