(function () {
    'use strict';
    function updateTradeSummaryInternal() {
        const givingContainer = document.getElementById('giving-items');
        const receivingContainer = document.getElementById('receiving-items');
        if (!givingContainer || !receivingContainer) {
            return;
        }
        const selectedInventory = document.querySelectorAll('#inventory-grid .item-card.selected');
        const allCatalogItems = document.querySelectorAll('#catalog-grid .item-card');
        const selectedCatalog = Array.from(allCatalogItems).filter((item) => {
            const quantityAttr = item.getAttribute('data-quantity');
            const quantityDataset = item.dataset.quantity;
            const quantity = parseInt(quantityAttr) || parseInt(quantityDataset) || 0;
            return quantity > 0;
        });
        const totalCatalogItems = Array.from(selectedCatalog).reduce((total, item) => {
            const quantityAttr = item.getAttribute('data-quantity');
            const quantityDataset = item.dataset.quantity;
            return total + (parseInt(quantityAttr) || parseInt(quantityDataset) || 0);
        }, 0);
        let yourTotalRap = 0;
        let yourTotalVal = 0;
        let theirTotalRap = 0;
        let theirTotalVal = 0;
        if (selectedInventory.length > 0) {
            givingContainer.innerHTML = Array.from(selectedInventory)
                .map((item) => {
                    const itemName = item.dataset.item;
                    const itemValue = parseInt(item.dataset.value);
                    const itemRap = parseInt(item.dataset.rap);
                    yourTotalVal += itemValue;
                    yourTotalRap += itemRap;
                    const imageEl =
                        item.querySelector('.item-image img') ||
                        item.querySelector('.item-image div');
                    let imageSrc = '';
                    if (imageEl && imageEl.tagName === 'IMG') {
                        imageSrc = `<img src="${imageEl.src}" alt="${itemName}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;">`;
                    } else if (imageEl) {
                        imageSrc = `<div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #2a2d30; border-radius: 4px; font-size: 10px; color: #bdbebe;">${itemName.substring(0, 3).toUpperCase()}</div>`;
                    } else {
                        imageSrc = `<div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #2a2d30; border-radius: 4px; font-size: 10px; color: #bdbebe;">${itemName.substring(0, 3).toUpperCase()}</div>`;
                    }
                    return `\n                    <div class="summary-item clickable-inventory-summary"\n                         data-original-item-index="${item.dataset.index}"\n                         title="Click to remove from selection&#10;${itemName}&#10;RAP ${itemRap.toLocaleString()}&#10;VAL ${itemValue.toLocaleString()}">\n                        ${imageSrc}\n                    </div>\n                `;
                })
                .join('');
        } else {
            givingContainer.innerHTML = `\n                <div style="border: 2px dashed #4a4c4e; background: transparent; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">\n                    <span style="color: #858585; font-size: 10px;">Select Items</span>\n                </div>\n            `;
        }
        if (selectedCatalog.length > 0) {
            const receivingItems = [];
            selectedCatalog.forEach((item) => {
                const itemName = item.dataset.item;
                const itemValue = parseInt(item.dataset.value);
                const itemRap = parseInt(item.dataset.rap);
                const quantityAttr = item.getAttribute('data-quantity');
                const quantityDataset = item.dataset.quantity;
                const quantity = parseInt(quantityAttr) || parseInt(quantityDataset) || 1;
                theirTotalVal += itemValue * quantity;
                theirTotalRap += itemRap * quantity;
                const imageEl =
                    item.querySelector('.item-image img') || item.querySelector('.item-image div');
                let imageSrc = '';
                if (imageEl && imageEl.tagName === 'IMG') {
                    imageSrc = `<img src="${imageEl.src}" alt="${itemName}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;">`;
                } else if (imageEl) {
                    imageSrc = `<div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #2a2d30; border-radius: 4px; font-size: 10px; color: #bdbebe;">${itemName.substring(0, 3).toUpperCase()}</div>`;
                } else {
                    imageSrc = `<div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #2a2d30; border-radius: 4px; font-size: 10px; color: #bdbebe;">${itemName.substring(0, 3).toUpperCase()}</div>`;
                }
                for (let i = 0; i < quantity; i++) {
                    receivingItems.push(
                        `\n                        <div class="summary-item clickable-summary"\n                             data-original-item-id="${item.dataset.id}"\n                             title="Click to remove one copy&#10;${itemName} (${i + 1}/${quantity})&#10;RAP ${itemRap.toLocaleString()}&#10;VAL ${itemValue.toLocaleString()}">\n                            ${imageSrc}\n                        </div>\n                    `
                    );
                }
            });
            receivingContainer.innerHTML = receivingItems.join('');
        } else {
            receivingContainer.innerHTML = `\n                <div style="border: 2px dashed #4a4c4e; background: transparent; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">\n                    <span style="color: #858585; font-size: 10px;">Select Items</span>\n                </div>\n            `;
        }
        const robuxGiveInput = document.getElementById('robux-give');
        const robuxGetInput = document.getElementById('robux-get');
        if (robuxGiveInput && robuxGiveInput.value) {
            const robuxGive = parseInt(robuxGiveInput.value) || 0;
            yourTotalRap += robuxGive;
            yourTotalVal += robuxGive;
        }
        if (robuxGetInput && robuxGetInput.value) {
            const robuxGet = parseInt(robuxGetInput.value) || 0;
            theirTotalRap += robuxGet;
            theirTotalVal += robuxGet;
        }
        updateTradeStatistics(yourTotalRap, yourTotalVal, theirTotalRap, theirTotalVal);
    }
    const updateTradeSummary = Utils.debounce(updateTradeSummaryInternal, 100);
    function updateTradeStatistics(yourRap, yourVal, theirRap, theirVal) {
        const rapProfit = theirRap - yourRap;
        const valProfit = theirVal - yourVal;
        const rapPercentage = yourRap > 0 ? ((theirRap - yourRap) / yourRap) * 100 : 0;
        const valPercentage = yourVal > 0 ? ((theirVal - yourVal) / yourVal) * 100 : 0;
        let statsContainer = DOM.$('#trade-statistics');
        if (!statsContainer) {
            const summaryContent = DOM.$('.auto-trades-injected .summary-content');
            if (summaryContent) {
                statsContainer = document.createElement('div');
                statsContainer.id = 'trade-statistics';
                statsContainer.className = 'trade-statistics';
                summaryContent.parentNode.appendChild(statsContainer);
            }
        }
        if (statsContainer && (yourRap > 0 || theirRap > 0)) {
            statsContainer.innerHTML = `\n                <div class="stats-header">Trade Analysis</div>\n                <div class="stats-grid">\n                    <div class="stat-section">\n                        <div class="stat-title">YOU</div>\n                        <div class="stat-values">\n                            <div class="rap-text">RAP ${yourRap.toLocaleString()}</div>\n                            <div class="val-text">VAL ${yourVal.toLocaleString()}</div>\n                        </div>\n                    </div>\n                    <div class="stat-section">\n                        <div class="stat-title">THEM</div>\n                        <div class="stat-values">\n                            <div class="rap-text">RAP ${theirRap.toLocaleString()}</div>\n                            <div class="val-text">VAL ${theirVal.toLocaleString()}</div>\n                        </div>\n                    </div>\n                    <div class="stat-section">\n                        <div class="stat-title">NET GAIN</div>\n                        <div class="stat-values">\n                            <div class="profit-text ${rapProfit >= 0 ? 'profit-positive' : 'profit-negative'}">\n                                ${rapProfit >= 0 ? '+' : ''}${rapProfit.toLocaleString()} RAP\n                            </div>\n                            <div class="profit-text ${valProfit >= 0 ? 'profit-positive' : 'profit-negative'}">\n                                ${valProfit >= 0 ? '+' : ''}${valProfit.toLocaleString()} VAL\n                            </div>\n                        </div>\n                    </div>\n                    <div class="stat-section">\n                        <div class="stat-title">WIN/LOSS %</div>\n                        <div class="stat-values">\n                            <div class="profit-text ${rapPercentage >= 0 ? 'profit-positive' : 'profit-negative'}">\n                                ${rapPercentage >= 0 ? '+' : ''}${rapPercentage.toFixed(1)}% RAP\n                            </div>\n                            <div class="profit-text ${valPercentage >= 0 ? 'profit-positive' : 'profit-negative'}">\n                                ${valPercentage >= 0 ? '+' : ''}${valPercentage.toFixed(1)}% VAL\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            `;
            statsContainer.style.display = 'block';
        } else if (statsContainer) {
            statsContainer.style.display = 'none';
        }
    }
    window.updateTradeSummaryGlobal = updateTradeSummary;
    window.updateTradeSummaryGlobalImmediate = updateTradeSummaryInternal;
    window.TradeSummary = {
        updateTradeSummary: updateTradeSummary,
        updateTradeSummaryInternal: updateTradeSummaryInternal,
        updateTradeStatistics: updateTradeStatistics,
    };
})();
