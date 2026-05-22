importScripts('../core/utils/timing.js');

importScripts('../core/utils/logger.js');

importScripts('../core/utils/retry.js');

importScripts('../core/utils/network.js');

importScripts('../core/utils/validation.js');

importScripts('../core/utils/cache.js');

importScripts('../core/utils.js');

importScripts('cache.js');

importScripts('handlers/player-assets.js');

importScripts('handlers/rolimons.js');

importScripts('handlers/common-owners.js');

importScripts('handlers/trade.js');

importScripts('handlers/user.js');

importScripts('handlers/thumbnails.js');

importScripts('handlers/proofs.js');

importScripts('handlers/trade-history.js');

importScripts('handlers/roautotrade-user-stats.js');

importScripts('handlers/rolimons-player-info.js');

importScripts('handlers/desktop-notification.js');

importScripts('handlers/password-store.js');

let tradeNotificationClaimChain = Promise.resolve();

function claimTradeNotification(accountId, notificationKey) {
    const storageKey = `notifiedTrades_${accountId}`;
    const promise = tradeNotificationClaimChain.then(async () => {
        try {
            const result = await chrome.storage.local.get([storageKey]);
            const arr = Array.isArray(result[storageKey]) ? [...result[storageKey]] : [];
            if (arr.includes(notificationKey)) {
                return { claimed: false };
            }
            arr.push(notificationKey);
            await chrome.storage.local.set({ [storageKey]: arr });
            return { claimed: true };
        } catch (e) {
            return { claimed: false };
        }
    });
    tradeNotificationClaimChain = promise.catch(() => {});
    return promise;
}

chrome.action.onClicked.addListener((_tab) => {
    chrome.tabs.create({
        url: 'https://roautotrade.com',
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchPlayerAssets') {
        return handleFetchPlayerAssets(request, sendResponse);
    } else if (request.action === 'checkCanTradeWith') {
        return handleCheckCanTradeWith(request, sendResponse);
    } else if (request.action === 'fetchRolimons') {
        return handleFetchRolimons(request, sendResponse);
    } else if (request.action === 'fetchCommonOwners') {
        return handleFetchCommonOwners(request, sendResponse);
    } else if (request.action === 'fetchInstanceIds') {
        return handleFetchInstanceIds(request, sendResponse);
    } else if (request.action === 'fetchAutoInstanceIds') {
        return handleFetchAutoInstanceIds(request, sendResponse);
    } else if (request.action === 'fetchUserAuth') {
        return handleFetchUserAuth(request, sendResponse);
    } else if (request.action === 'fetchUserInventory') {
        return handleFetchUserInventory(request, sendResponse);
    } else if (request.action === 'fetchUsernamesBatch') {
        return handleFetchUsernamesBatch(request, sendResponse);
    } else if (request.action === 'fetchThumbnail') {
        return handleFetchThumbnail(request, sendResponse);
    } else if (request.action === 'fetchProofs') {
        return handleFetchProofs(request, sendResponse);
    } else if (request.action === 'fetchTradeHistory') {
        return handleFetchTradeHistory(request, sendResponse);
    } else if (request.action === 'fetchRolautotradeUserStats') {
        return handleFetchRolautotradeUserStats(request, sendResponse);
    } else if (request.action === 'fetchRolautotradeUserPreferences') {
        return handleFetchRolautotradeUserPreferences(request, sendResponse);
    } else if (request.action === 'fetchRolimonsPlayerInfo') {
        return handleFetchRolimonsPlayerInfo(request, sendResponse);
    } else if (request.action === 'showDesktopNotification') {
        return handleShowDesktopNotification(request, sendResponse);
    } else if (request.action === 'clearAccountCaches') {
        if (commonOwnersCache && commonOwnersCache.map) {
            commonOwnersCache.map.clear();
        }
        if (inventoryCache && inventoryCache.map) {
            inventoryCache.map.clear();
        }
        if (playerAssetsCache && playerAssetsCache.map) {
            playerAssetsCache.map.clear();
        }
        sendResponse({
            success: true,
        });
        return true;
    } else if (request.action === 'claimTradeNotification') {
        claimTradeNotification(request.accountId, request.notificationKey).then(sendResponse);
        return true;
    } else if (request.action === 'passwordStore.set') {
        return handleSetPassword(request, sender, sendResponse);
    } else if (request.action === 'passwordStore.get') {
        return handleGetPassword(request, sender, sendResponse);
    } else if (request.action === 'passwordStore.clear') {
        return handleClearPassword(request, sender, sendResponse);
    } else if (request.action === 'passwordStore.clearAll') {
        return handleClearAllPasswords(request, sender, sendResponse);
    }
});
