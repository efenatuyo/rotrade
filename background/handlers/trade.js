function handleCheckCanTradeWith(request, sendResponse) {
    fetch('https://auth.roblox.com/v1/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(tokenResponse => {
        const csrfToken = tokenResponse.headers.get('x-csrf-token');

        const headers = {
            'Content-Type': 'application/json'
        };

        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken;
        }

        return fetch(`https://trades.roblox.com/v1/users/${request.userId}/can-trade-with`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        sendResponse({ success: true, data: data });
    })
    .catch(error => {
        console.error('Background: Error checking can-trade:', error);
        sendResponse({ success: false, error: error.message });
    });

    return true;
}

function handleFetchInstanceIds(request, sendResponse) {
    fetch("https://roautotrade.com/api/instance-ids", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request.payload)
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Background: API Error response:', text);
                    throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            console.error('Background: Error fetching instance IDs:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}

function handleFetchAutoInstanceIds(request, sendResponse) {
    fetch("https://roautotrade.com/api/auto-instance-ids", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request.payload)
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Background: API Error response:', text);
                    throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            console.error('Background: Error fetching auto instance IDs:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}