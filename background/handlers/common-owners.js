function handleFetchCommonOwners(request, sendResponse) {
    const { itemIds, maxOwnerDays = 100000000, lastOnlineDays = 3 } = request;
    
    // Validate itemIds
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        sendResponse({ success: false, error: "No item IDs provided or invalid format" });
        return true;
    }
    
    // Filter out invalid item IDs and ensure they're numbers
    const validItemIds = itemIds
        .map(id => typeof id === 'number' ? id : parseInt(id))
        .filter(id => !isNaN(id) && id > 0);
    
    if (validItemIds.length === 0) {
        sendResponse({ success: false, error: "No valid item IDs provided" });
        return true;
    }
    
    const cacheKey = JSON.stringify({ itemIds: validItemIds, maxOwnerDays, lastOnlineDays });
    const now = Date.now();

    const cached = commonOwnersCache.map.get(cacheKey);
    if (cached && (now - cached.timestamp < commonOwnersCache.duration)) {
        sendResponse({ success: true, data: cached.data });
        return true;
    }

    const url = `https://roautotrade.com/api/common-owners?item_ids=${validItemIds.join(',')}&max_owner_days=${maxOwnerDays}&last_online_days=${lastOnlineDays}&detailed=true`;

    const fetchWithTimeout = (url, timeout = 30000) => {
        return Promise.race([
            fetch(url),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
        ]);
    };

    const attemptFetch = async (retries = 3) => {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await fetchWithTimeout(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                let ownersData = data;
                if (data && typeof data === 'object') {
                    if (data.owners && Array.isArray(data.owners)) {
                        ownersData = data;
                    } else if (Array.isArray(data)) {
                        ownersData = { owners: data };
                    } else if (data.data && Array.isArray(data.data)) {
                        ownersData = { owners: data.data };
                    }
                }
                
                commonOwnersCache.map.set(cacheKey, {
                    data: ownersData,
                    timestamp: Date.now()
                });
                sendResponse({ success: true, data: ownersData });
                return;
            } catch (error) {
                const isLastAttempt = attempt === retries - 1;
                if (isLastAttempt) {
                    console.error('Background: Error fetching common owners after retries:', error);
                    sendResponse({ success: false, error: error.message });
                    return;
                }
                console.warn(`Background: Common owners fetch attempt ${attempt + 1} failed, retrying in 10 seconds...`, error.message);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    };

    attemptFetch();

    return true;
}
