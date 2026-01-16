function handleFetchRolimons(request, sendResponse) {
    const cacheEntry = rolimonsCache;
    const now = Date.now();

    if (cacheEntry.data && (now - cacheEntry.timestamp < cacheEntry.duration)) {
        sendResponse({ success: true, data: cacheEntry.data });
        return true;
    }

    if (cacheEntry.promise) {
        cacheEntry.promise.then(data => {
            sendResponse({ success: true, data: data });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    cacheEntry.promise = (async () => {
        try {
            const response = await fetch("https://api.rolimons.com/items/v2/itemdetails");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data || typeof data !== 'object' || !data.items) {
                throw new Error('Invalid Rolimons data format');
            }
            
            cacheEntry.data = data;
            cacheEntry.timestamp = Date.now();
            cacheEntry.promise = null;
            return data;
        } catch (error) {
            cacheEntry.promise = null;
            console.error('Background: Error fetching Rolimons data:', error);
            throw error;
        }
    })();

    cacheEntry.promise.then(data => {
        sendResponse({ success: true, data: data });
    }).catch(error => {
        console.error('Background: Error fetching Rolimons data:', error);
        sendResponse({ success: false, error: error.message || 'Failed to fetch Rolimons data' });
    });

    return true;
}
