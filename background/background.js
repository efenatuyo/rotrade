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

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: 'https://roautotrade.com'
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchPlayerAssets") {
        return handleFetchPlayerAssets(request, sendResponse);
    } else if (request.action === "checkCanTradeWith") {
        return handleCheckCanTradeWith(request, sendResponse);
    } else if (request.action === "fetchRolimons") {
        return handleFetchRolimons(request, sendResponse);
    } else if (request.action === "fetchCommonOwners") {
        return handleFetchCommonOwners(request, sendResponse);
    } else if (request.action === "fetchInstanceIds") {
        return handleFetchInstanceIds(request, sendResponse);
    } else if (request.action === "fetchAutoInstanceIds") {
        return handleFetchAutoInstanceIds(request, sendResponse);
    } else if (request.action === "fetchUserAuth") {
        return handleFetchUserAuth(request, sendResponse);
    } else if (request.action === "fetchUserInventory") {
        return handleFetchUserInventory(request, sendResponse);
    } else if (request.action === "fetchThumbnail") {
        return handleFetchThumbnail(request, sendResponse);
    } else if (request.action === "fetchProofs") {
        return handleFetchProofs(request, sendResponse);
    }
});
