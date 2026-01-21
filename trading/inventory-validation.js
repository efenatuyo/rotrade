(function() {
    'use strict';

    async function validateAutoTradesInventory() {
        try {
            const autoTrades = Storage.getAccount('autoTrades', []);
            if (autoTrades.length === 0) {
                return;
            }

            const currentUserId = Inventory.getCurrentUserId() || await Inventory.getCurrentUserIdAsync();
            if (!currentUserId) {
                return;
            }

            let rolimonData = {};
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'fetchRolimons'
                });
                if (response.success) {
                    rolimonData = response.data.items || {};
                }
            } catch (error) {
            }

            const userInventory = await Inventory.getUserCollectibles(currentUserId);
            if (!userInventory || userInventory.length === 0) {
                Storage.setAccount('autoTrades', []);
                const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
                Storage.setAccount('pendingExtensionTrades', []);
                return;
            }

            const inventoryItemCounts = new Map();
            userInventory.forEach(item => {
                const itemId = item.id || item.itemId;
                if (itemId) {
                    const itemIdStr = String(itemId).trim();
                    const itemIdNum = String(Number(itemId)).trim();
                    
                    const currentCount = inventoryItemCounts.get(itemIdStr) || 0;
                    inventoryItemCounts.set(itemIdStr, currentCount + 1);
                    
                    if (itemIdStr !== itemIdNum) {
                        const currentCountNum = inventoryItemCounts.get(itemIdNum) || 0;
                        inventoryItemCounts.set(itemIdNum, currentCountNum + 1);
                    }
                }
            });

            const validAutoTrades = [];
            const invalidTradeIds = new Set();

            for (const trade of autoTrades) {
                const giving = trade.giving || [];
                
                if (giving.length === 0) {
                    validAutoTrades.push(trade);
                    continue;
                }

                const tradeItemIds = await Opportunities.getItemIdsFromTrade(giving, rolimonData);
                
                if (tradeItemIds.length === 0) {
                    validAutoTrades.push(trade);
                    continue;
                }

                const requiredItemCounts = new Map();
                tradeItemIds.forEach(itemId => {
                    const itemIdStr = String(itemId).trim();
                    const currentCount = requiredItemCounts.get(itemIdStr) || 0;
                    requiredItemCounts.set(itemIdStr, currentCount + 1);
                });

                let hasAllItems = true;
                for (const [itemIdStr, requiredCount] of requiredItemCounts.entries()) {
                    const itemIdNum = String(Number(itemIdStr)).trim();
                    const itemIdNumStr = itemIdNum !== 'NaN' ? itemIdNum : null;
                    
                    let availableCount = 0;
                    if (inventoryItemCounts.has(itemIdStr)) {
                        availableCount = inventoryItemCounts.get(itemIdStr);
                    } else if (itemIdNumStr && inventoryItemCounts.has(itemIdNumStr)) {
                        availableCount = inventoryItemCounts.get(itemIdNumStr);
                    } else {
                        const numId = parseInt(itemIdStr, 10);
                        if (!isNaN(numId)) {
                            const numIdStr = String(numId);
                            if (inventoryItemCounts.has(numIdStr)) {
                                availableCount = inventoryItemCounts.get(numIdStr);
                            }
                        }
                    }
                    
                    if (availableCount < requiredCount) {
                        hasAllItems = false;
                        break;
                    }
                }

                if (hasAllItems) {
                    validAutoTrades.push(trade);
                } else {
                    invalidTradeIds.add(trade.id);
                }
            }

            const pendingTrades = Storage.getAccount('pendingExtensionTrades', []);
            const validPendingTrades = [];

            for (const trade of pendingTrades) {
                const autoTradeId = trade.autoTradeId;
                
                if (invalidTradeIds.has(autoTradeId)) {
                    continue;
                }

                const giving = trade.giving || [];
                
                if (giving.length === 0) {
                    validPendingTrades.push(trade);
                    continue;
                }

                const tradeItemIds = await Opportunities.getItemIdsFromTrade(giving, rolimonData);
                
                if (tradeItemIds.length === 0) {
                    validPendingTrades.push(trade);
                    continue;
                }

                const requiredItemCounts = new Map();
                tradeItemIds.forEach(itemId => {
                    const itemIdStr = String(itemId).trim();
                    const currentCount = requiredItemCounts.get(itemIdStr) || 0;
                    requiredItemCounts.set(itemIdStr, currentCount + 1);
                });

                let hasAllItems = true;
                for (const [itemIdStr, requiredCount] of requiredItemCounts.entries()) {
                    const itemIdNum = String(Number(itemIdStr)).trim();
                    const itemIdNumStr = itemIdNum !== 'NaN' ? itemIdNum : null;
                    
                    let availableCount = 0;
                    if (inventoryItemCounts.has(itemIdStr)) {
                        availableCount = inventoryItemCounts.get(itemIdStr);
                    } else if (itemIdNumStr && inventoryItemCounts.has(itemIdNumStr)) {
                        availableCount = inventoryItemCounts.get(itemIdNumStr);
                    } else {
                        const numId = parseInt(itemIdStr, 10);
                        if (!isNaN(numId)) {
                            const numIdStr = String(numId);
                            if (inventoryItemCounts.has(numIdStr)) {
                                availableCount = inventoryItemCounts.get(numIdStr);
                            }
                        }
                    }
                    
                    if (availableCount < requiredCount) {
                        hasAllItems = false;
                        break;
                    }
                }

                if (hasAllItems) {
                    validPendingTrades.push(trade);
                }
            }

            if (invalidTradeIds.size > 0 || validPendingTrades.length !== pendingTrades.length) {
                Storage.setAccount('autoTrades', validAutoTrades);
                Storage.setAccount('pendingExtensionTrades', validPendingTrades);
                Storage.flush();
            }
        } catch (error) {
            console.error('Error during inventory validation:', error);
        }
    }

    window.InventoryValidation = {
        validateAutoTradesInventory
    };

    window.validateAutoTradesInventory = validateAutoTradesInventory;

})();
