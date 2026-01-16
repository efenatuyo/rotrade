(function() {
    'use strict';

    function preloadTradeThumbnails(trades) {
        const allItemIds = new Set();
        
        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];
            const giving = Array.isArray(trade.giving) ? trade.giving : [];
            const receiving = Array.isArray(trade.receiving) ? trade.receiving : [];
            
            for (let j = 0; j < giving.length; j++) {
                const itemId = giving[j].id || giving[j].itemId;
                if (itemId) allItemIds.add(String(itemId).trim());
            }
            
            for (let j = 0; j < receiving.length; j++) {
                const itemId = receiving[j].id || receiving[j].itemId;
                if (itemId) allItemIds.add(String(itemId).trim());
            }
        }
        
        if (allItemIds.size === 0) return;
        
        if (!window.thumbnailCache) {
            window.thumbnailCache = {};
            try {
                const stored = localStorage.getItem('thumbnailCache');
                if (stored) {
                    window.thumbnailCache = JSON.parse(stored);
                }
            } catch {}
        }
        
        const itemIdsToLoad = [];
        for (const id of allItemIds) {
            const itemIdStr = String(id).trim();
            if (!window.thumbnailCache[itemIdStr]) {
                itemIdsToLoad.push(itemIdStr);
            }
        }
        
        if (itemIdsToLoad.length === 0) return;
        
        const batchSize = 100;
        const batchCount = Math.ceil(itemIdsToLoad.length / batchSize);
        
        const delay = window.Utils?.delay || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
        
        for (let i = 0; i < batchCount; i++) {
            const batch = itemIdsToLoad.slice(i * batchSize, (i + 1) * batchSize);
            delay(i * 200).then(() => {
                if (window.Thumbnails && window.Thumbnails.fetchBatch) {
                    window.Thumbnails.fetchBatch(batch).catch(() => {});
                }
            });
        }
    }

    window.TradeLoadingThumbnails = {
        preloadTradeThumbnails
    };

    window.preloadTradeThumbnails = preloadTradeThumbnails;

})();