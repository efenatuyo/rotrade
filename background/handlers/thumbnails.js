function handleFetchThumbnail(request, sendResponse) {
    const itemId = request.itemId;
    const now = Date.now();
    
    const cached = thumbnailCache.map.get(itemId);
    if (cached && (now - cached.timestamp < thumbnailCache.duration)) {
        sendResponse({ success: true, data: cached.data });
        return true;
    }

    fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${itemId}&size=150x150&format=Png&isCircular=false`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            thumbnailCache.map.set(itemId, {
                data: data,
                timestamp: Date.now()
            });
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            console.error('Background: Error fetching thumbnail:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}
