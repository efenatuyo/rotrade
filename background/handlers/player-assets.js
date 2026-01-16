
function handleFetchPlayerAssets(request, sendResponse) {
    const userIds = Array.isArray(request.userIds) ? request.userIds : [];
    const now = Date.now();

    if (userIds.length === 0) {
        sendResponse({ success: false, error: "No user IDs provided" });
        return true;
    }

    const cachedResults = {};
    const uncachedUserIds = [];

    for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const cached = playerAssetsCache.map.get(userId);
        if (cached && (now - cached.timestamp < playerAssetsCache.duration)) {
            cachedResults[userId] = cached.data;
        } else {
            uncachedUserIds.push(userId);
        }
    }

    if (uncachedUserIds.length === 0) {
        sendResponse({ success: true, data: { results: cachedResults, failedUsers: [] } });
        return true;
    }

    const results = {};
    const failedUsers = [];
    const BATCH_SIZE = 9;
    
    async function processUsersInBatches() {
        for (let i = 0; i < uncachedUserIds.length; i += BATCH_SIZE) {
            const batch = uncachedUserIds.slice(i, i + BATCH_SIZE);
            
            const batchPromises = batch.map(async (userId) => {
                try {
                    const response = await fetch(`https://roautotrade.com/api/playerassets/${userId}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    if (data && data.success && data.playerAssets) {
                        const playerAssets = data.playerAssets;
                        playerAssetsCache.map.set(userId, {
                            data: playerAssets,
                            timestamp: Date.now()
                        });
                        return { userId, success: true, data: playerAssets };
                    } else {
                        return { userId, success: false, reason: 'No assets or privacy enabled' };
                    }
                } catch (error) {
                    return { userId, success: false, reason: error.message };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            
            batchResults.forEach(result => {
                if (result.success) {
                    results[result.userId] = result.data;
                } else {
                    failedUsers.push({ userId: result.userId, reason: result.reason });
                }
            });

            if (i + BATCH_SIZE < uncachedUserIds.length) {
                await Utils.delay(500);
            }
        }
    }

    processUsersInBatches()
        .then(() => {
            const finalResults = { ...cachedResults, ...results };
            const finalResult = { results: finalResults, failedUsers };
            sendResponse({ success: true, data: finalResult });
        })
        .catch(error => {
            console.error('Background: Error in player assets fetch:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}
