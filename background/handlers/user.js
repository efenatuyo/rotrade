function handleFetchUserAuth(request, sendResponse) {
    (async () => {
        const result = await Utils.safeFetch("https://users.roblox.com/v1/users/authenticated", {
            timeout: 8000,
            retries: 2
        });

        if (result.ok) {
            const userData = result.data?.data || result.data;
            
            if (!userData || typeof userData !== 'object' || Array.isArray(userData)) {
                Utils.Logger.log('fetch_user_auth_validation_failed', { 
                    errors: ['userData is not a valid object'], 
                    resultData: result.data,
                    userData: userData,
                    userDataType: typeof userData,
                    isArray: Array.isArray(userData)
                });
                sendResponse({ success: false, error: 'Invalid user data format: data is not an object' });
                return;
            }

            const validated = Utils.validateData(userData, {
                id: { type: 'number', required: true},
                name: { type: 'string', required: true, },
                displayName: { type: 'string', required: true}
            });
            
            if (validated.valid) {
                sendResponse({ success: true, data: validated.data });
            } else {
                Utils.Logger.log('fetch_user_auth_validation_failed', { 
                    errors: validated.errors,
                    receivedData: userData
                });
                sendResponse({ success: false, error: 'Invalid user data format' });
            }
        } else {
            Utils.Logger.log('fetch_user_auth_failed', { error: result.error?.message });
            sendResponse({ success: false, error: result.error?.message || 'Failed to fetch user auth' });
        }
    })();

    return true;
}

function handleFetchUserInventory(request, sendResponse) {
    const cacheKey = `${request.userId}_${request.cursor || ''}`;
    const now = Date.now();
    
    const cached = inventoryCache.map.get(cacheKey);
    if (cached && (now - cached.timestamp < inventoryCache.duration)) {
        sendResponse({ success: true, data: cached.data });
        return true;
    }

    let url = `https://inventory.roblox.com/v1/users/${request.userId}/assets/collectibles?sortOrder=Asc&limit=100`;
    if (request.cursor) {
        url += `&cursor=${request.cursor}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            inventoryCache.map.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            console.error('Background: Error fetching user collectibles:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}
