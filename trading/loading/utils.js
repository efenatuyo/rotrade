(function() {
    'use strict';

    function createRolimonsIndex(rolimonData) {
        const nameIndex = new Map();
        const idIndex = new Map();
        
        for (const [itemId, itemData] of Object.entries(rolimonData)) {
            if (Array.isArray(itemData) && itemData.length >= 5) {
                const name = itemData[0];
                if (name && typeof name === 'string') {
                    nameIndex.set(name, { id: parseInt(itemId), data: itemData });
                }
                idIndex.set(itemId, itemData);
            }
        }
        
        return { nameIndex, idIndex };
    }

    function enrichItemWithRolimons(item, nameIndex) {
        if (!item.name) return item;
        const itemName = (item.name || '').trim();
        
        let rolimonEntry = nameIndex.get(itemName);
        if (!rolimonEntry && itemName) {
            for (const [key, value] of nameIndex.entries()) {
                if (key && typeof key === 'string' && key.trim().toLowerCase() === itemName.toLowerCase()) {
                    rolimonEntry = value;
                    break;
                }
            }
        }
        
        if (!rolimonEntry) return item;
        
        const { id: itemId, data: rolimonItem } = rolimonEntry;
        return {
            ...item,
            id: itemId || item.id || item.itemId,
            itemId: itemId || item.id || item.itemId,
            rap: rolimonItem[2],
            value: rolimonItem[4]
        };
    }

    window.TradeLoadingUtils = {
        createRolimonsIndex,
        enrichItemWithRolimons
    };

})();