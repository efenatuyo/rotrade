function handleFetchProofs(request, sendResponse) {
    const rawName = request.itemName;
    const itemId = request.itemId;
    let searchPath;
    if (rawName && String(rawName).trim()) {
        searchPath = encodeURIComponent(String(rawName).trim());
    } else if (itemId) {
        searchPath = String(itemId);
    } else {
        sendResponse({
            success: false,
            error: 'Missing item name or id',
        });
        return true;
    }
    fetch(`https://roautotrade.com/api/messages/search/${searchPath}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(async (response) => {
            if (response.status === 404) {
                sendResponse({
                    success: true,
                    data: {
                        results: [],
                        item_name: null,
                        acronym: null,
                    },
                });
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (data === null) {
                return;
            }
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
