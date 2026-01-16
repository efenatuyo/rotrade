function handleFetchProofs(request, sendResponse) {
    const itemId = request.itemId;
    
    fetch(`https://roautotrade.com/api/messages/search/${itemId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
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
            console.error('Background: Error fetching proofs:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}
