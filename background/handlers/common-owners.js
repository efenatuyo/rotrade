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

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            commonOwnersCache.map.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            console.error('Background: Error fetching common owners:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}
