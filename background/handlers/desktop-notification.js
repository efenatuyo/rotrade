function handleShowDesktopNotification(request, sendResponse) {
    const title =
        typeof request.title === 'string' && request.title.trim()
            ? request.title.trim().slice(0, 120)
            : 'RoTrade';
    const message =
        typeof request.message === 'string' ? request.message.trim().slice(0, 500) : '';
    if (!message) {
        sendResponse({ success: false, error: 'empty_message' });
        return false;
    }
    if (!chrome.notifications || typeof chrome.notifications.create !== 'function') {
        sendResponse({ success: false, error: 'notifications_unavailable' });
        return false;
    }
    chrome.permissions.contains(
        { permissions: ['notifications'] },
        function (granted) {
            if (!granted) {
                sendResponse({ success: false, error: 'permission_not_granted' });
                return;
            }
            const iconUrl = chrome.runtime.getURL('assets/icon.png');
            const options = {
                type: 'basic',
                iconUrl: iconUrl,
                title: title,
                message: message,
                priority: 1,
            };
            try {
                chrome.notifications.create('', options, function (id) {
                    if (chrome.runtime.lastError) {
                        sendResponse({
                            success: false,
                            error: chrome.runtime.lastError.message || 'create_failed',
                        });
                        return;
                    }
                    sendResponse({ success: true, id: id });
                });
            } catch (err) {
                sendResponse({
                    success: false,
                    error: err && err.message ? err.message : 'create_threw',
                });
            }
        }
    );
    return true;
}
