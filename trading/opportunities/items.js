(function() {
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

        [...trade.giving, ...trade.receiving].forEach(item => {
            let estimatedCopies;

            if (item.value > 1000000) {
                estimatedCopies = Math.floor(Math.random() * 50) + 10;
            } else if (item.value > 100000) {
                estimatedCopies = Math.floor(Math.random() * 200) + 50;
            } else if (item.value > 10000) {
                estimatedCopies = Math.floor(Math.random() * 500) + 100;
            } else if (item.value > 1000) {
                estimatedCopies = Math.floor(Math.random() * 2000) + 500;
            } else {
                estimatedCopies = Math.floor(Math.random() * 10000) + 1000;
            }

            minCopies = Math.min(minCopies, estimatedCopies);
        });

        return minCopies === Infinity ? 1000 : minCopies;
    }

    window.OpportunitiesItems = {
        getItemIdsFromTrade,
        estimateItemCopies
    };

    window.getItemIdsFromTrade = getItemIdsFromTrade;
    window.estimateItemCopies = estimateItemCopies;

})();