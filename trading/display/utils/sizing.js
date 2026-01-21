(function() {
    'use strict';

    const sizeCache = new WeakMap();
    const SIZE_CLASSES = ['items-2', 'items-3', 'items-4', 'items-5', 'items-6', 'items-7', 'items-8-plus'];

    const getItemCount = (list) => list.querySelectorAll('.item-icon:not(.robux-icon)').length;

    const getSizeClass = (count) => {
        if (count >= 8) return 'items-8-plus';
        if (count >= 2 && count <= 7) return `items-${count}`;
        return 'items-2';
    };

    const applySize = (list, count) => {
        if (sizeCache.has(list)) {
            const cached = sizeCache.get(list);
            if (cached.count === count) return;
        }
        list.classList.remove(...SIZE_CLASSES);
        const cls = getSizeClass(count);
        list.classList.add(cls);
        sizeCache.set(list, { count, class: cls });
    };

    const applySizing = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const cards = container.querySelectorAll('.trade-card');
        cards.forEach(card => {
            const sections = card.querySelectorAll('.items-section');
            if (sections.length === 2) {
                const giveList = sections[0].querySelector('.items-list');
                const getList = sections[1].querySelector('.items-list');
                if (giveList && getList) {
                    const max = Math.max(getItemCount(giveList), getItemCount(getList), 1);
                    applySize(giveList, max);
                    applySize(getList, max);
                }
            }
        });
    };

    window.TradeDisplaySizing = { applySizing };

})();
