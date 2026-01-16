(function() {
    'use strict';

    async function getItemIdsFromTrade(items, rolimonData) {
        let itemIds = [];
        
        items.forEach(item => {
            let itemId = item.id || item.itemId;
            
            if (!itemId && item.name && Object.keys(rolimonData).length > 0) {
                const itemName = (item.name || '').trim();
                const rolimonEntry = Object.entries(rolimonData).find(([id, data]) => {
                    if (!Array.isArray(data) || data.length < 5) return false;
                    const rolimonName = (data[0] || '').trim();
                    return rolimonName.toLowerCase() === itemName.toLowerCase();
                });

                if (rolimonEntry) {
                    itemId = parseInt(rolimonEntry[0]);
                }
            }
            
            if (itemId && !isNaN(itemId) && itemId > 0) {
                itemIds.push(itemId);
            }
        });

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