
const passwordStore = new Map();
const PASSWORD_TTL_MS = 10 * 60 * 1e3;

function isTrustedSender(sender) {
    if (!sender || !sender.url) return false;
    return /^https?:\/\/(?:www\.)?roblox\.com\//.test(sender.url);
}

function clearPasswordTimer(userId) {
    const entry = passwordStore.get(userId);
    if (entry && entry.timerId) {
        clearTimeout(entry.timerId);
    }
}

function handleSetPassword(request, sender, sendResponse) {
    if (!isTrustedSender(sender)) {
        sendResponse({ success: false, error: 'Untrusted sender' });
        return false;
    }
    const userId = String(request.userId || '');
    const password = request.password;
    if (!userId || typeof password !== 'string') {
        sendResponse({ success: false, error: 'Invalid args' });
        return false;
    }
    clearPasswordTimer(userId);
    const timerId = setTimeout(() => {
        passwordStore.delete(userId);
    }, PASSWORD_TTL_MS);
    passwordStore.set(userId, { password: password, timerId: timerId });
    sendResponse({ success: true });
    return false;
}

function handleGetPassword(request, sender, sendResponse) {
    if (!isTrustedSender(sender)) {
        sendResponse({ success: false, error: 'Untrusted sender' });
        return false;
    }
    const userId = String(request.userId || '');
    const entry = passwordStore.get(userId);
    sendResponse({
        success: true,
        password: entry ? entry.password : null,
    });
    return false;
}

function handleClearPassword(request, sender, sendResponse) {
    if (!isTrustedSender(sender)) {
        sendResponse({ success: false, error: 'Untrusted sender' });
        return false;
    }
    const userId = String(request.userId || '');
    clearPasswordTimer(userId);
    passwordStore.delete(userId);
    sendResponse({ success: true });
    return false;
}

function handleClearAllPasswords(_request, sender, sendResponse) {
    if (!isTrustedSender(sender)) {
        sendResponse({ success: false, error: 'Untrusted sender' });
        return false;
    }
    for (const userId of passwordStore.keys()) {
        clearPasswordTimer(userId);
    }
    passwordStore.clear();
    sendResponse({ success: true });
    return false;
}

if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onRemoved) {
    chrome.tabs.onRemoved.addListener(() => {
        chrome.tabs.query({ url: '*://*.roblox.com/*' }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                for (const userId of passwordStore.keys()) {
                    clearPasswordTimer(userId);
                }
                passwordStore.clear();
            }
        });
    });
}
