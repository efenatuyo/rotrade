(function () {
    'use strict';
    async function getItemIdsFromTrade(items, rolimonData) {
        const itemIds = [];
        let rolimonLookup = null;
        if (Object.keys(rolimonData).length > 0) {
            rolimonLookup = new Map();
            for (const [itemId, itemData] of Object.entries(rolimonData)) {
                if (Array.isArray(itemData) && itemData.length >= 5) {
                    const rolimonName = (itemData[0] || '').trim().toLowerCase();
                    if (rolimonName) {
                        rolimonLookup.set(rolimonName, parseInt(itemId) || 0);
                    }
                }
            }
        }
        for (const item of items) {
            let itemId = item.id || item.itemId;
            if (!itemId && item.name && rolimonLookup) {
                const itemName = (item.name || '').trim().toLowerCase();
                itemId = rolimonLookup.get(itemName) || null;
            }
            if (itemId && !isNaN(itemId) && itemId > 0) {
                itemIds.push(itemId);
            }
        }
        return itemIds.sort((a, b) => a - b);
    }
    function estimateItemCopies(trade) {
        let minCopies = Infinity;
        [...trade.giving, ...trade.receiving].forEach((item) => {
            let estimatedCopies;
            if (item.value > 1e6) {
                estimatedCopies = Math.floor(Math.random() * 50) + 10;
            } else if (item.value > 1e5) {
                estimatedCopies = Math.floor(Math.random() * 200) + 50;
            } else if (item.value > 1e4) {
                estimatedCopies = Math.floor(Math.random() * 500) + 100;
            } else if (item.value > 1e3) {
                estimatedCopies = Math.floor(Math.random() * 2e3) + 500;
            } else {
                estimatedCopies = Math.floor(Math.random() * 1e4) + 1e3;
            }
            minCopies = Math.min(minCopies, estimatedCopies);
        });
        return minCopies === Infinity ? 1e3 : minCopies;
    }
    window.OpportunitiesItems = {
        getItemIdsFromTrade: getItemIdsFromTrade,
        estimateItemCopies: estimateItemCopies,
    };
    window.getItemIdsFromTrade = getItemIdsFromTrade;
    window.estimateItemCopies = estimateItemCopies;
})();
