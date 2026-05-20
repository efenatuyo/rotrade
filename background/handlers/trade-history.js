function handleFetchTradeHistory(request, sendResponse) {
    const scope = request && request.scope;
    const key = request && request.key;
    if (scope !== 'ciid' && scope !== 'item') {
        sendResponse({
            success: false,
            error: "Invalid scope (expected 'ciid' or 'item')",
        });
        return true;
    }
    if (!key || !String(key).trim()) {
        sendResponse({
            success: false,
            error: 'Missing key',
        });
        return true;
    }
    const url = `https://roautotrade.com/api/trades/${scope}/${encodeURIComponent(String(key).trim())}`;
    fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    })
        .then(async (response) => {
            if (response.status === 404) {
                sendResponse({
                    success: true,
                    data: {
                        ok: true,
                        data: [],
                        error: null,
                        meta: null,
                        pagination: null,
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
                error: error && error.message ? error.message : String(error),
            });
        });
    return true;
}
