(function() {
    'use strict';

    function displayAutoTrades(autoTrades) {
        const container = document.getElementById('auto-trades-container');
        const emptyState = document.getElementById('empty-state');
        const autoTradesSection = document.getElementById('auto-trades-section');

        if (!container) return;

        const isAutoTradesSectionVisible = autoTradesSection && 
                                          window.getComputedStyle(autoTradesSection).display !== 'none';

        if (autoTrades.length === 0) {
            container.style.display = 'grid';
            container.innerHTML = '';
            if (emptyState && isAutoTradesSectionVisible) {
                container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">🤖</div>
                    <div class="empty-state-title">No Auto Trades Yet</div>
                    <div class="empty-state-text">
                        Create your first automated trade to get started.<br>
                        Set up trades to run automatically and maximize your trading efficiency.
                    </div>
                </div>`;
            }
            if (emptyState) emptyState.style.display = 'none';
            return;
        }

        container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        const cards = autoTrades.map(autoTrade => {
            const yourRap = autoTrade.giving.reduce((sum, item) => sum + item.rap, 0) + (autoTrade.robuxGive || 0);
            const yourVal = autoTrade.giving.reduce((sum, item) => sum + item.value, 0) + (autoTrade.robuxGive || 0);
            const theirRap = autoTrade.receiving.reduce((sum, item) => sum + item.rap, 0) + (autoTrade.robuxGet || 0);
            const theirVal = autoTrade.receiving.reduce((sum, item) => sum + item.value, 0) + (autoTrade.robuxGet || 0);

            const rapProfit = theirRap - yourRap;
            const valProfit = theirVal - yourVal;

            const maxTrades = autoTrade.settings?.maxTrades || autoTrade.settings?.maxTradesPerDay || 5;
            const tradesExecutedToday = Trades.getTodayTradeCount(autoTrade.id);

            const statusIcon = tradesExecutedToday >= maxTrades ? '✅' : '⏳';
            const statusText = tradesExecutedToday >= maxTrades ?
                `COMPLETE (${tradesExecutedToday}/${maxTrades})` :
                `INCOMPLETE (${tradesExecutedToday}/${maxTrades})`;

            return `
                <div class="auto-trade-card" data-status="${autoTrade.status}" data-id="${autoTrade.id}">
                    <div class="auto-trade-header">
                        <div class="auto-trade-name">${SecurityUtils.sanitizeHtml(autoTrade.name)}</div>
                        <div class="auto-trade-status status-${autoTrade.status}">
                            ${statusIcon} ${statusText}
                        </div>
                    </div>

                    <div class="auto-trade-items">
                        <div class="items-section">
                            <div class="items-title">You Give</div>
                            <div class="items-list">
                                ${autoTrade.giving.map(item => {
                                    const itemId = item.id || item.itemId || '';
                                    const itemIdStr = itemId ? String(itemId) : '';
                                    const itemName = SecurityUtils.sanitizeHtml(item.name || 'Unknown Item');
                                    const itemNameShort = SecurityUtils.sanitizeHtml((item.name || 'UI').substring(0, 2).toUpperCase());
                                    return `<div class="item-icon" data-item-id="${SecurityUtils.sanitizeAttribute(itemIdStr)}" data-id="${SecurityUtils.sanitizeAttribute(itemIdStr)}" data-item-name="${SecurityUtils.sanitizeAttribute(item.name || '')}" title="${itemName}&#10;RAP ${(item.rap || 0).toLocaleString()}&#10;VAL ${(item.value || 0).toLocaleString()}">${itemNameShort}</div>`;
                                }).join('')}
                            </div>
                        </div>

                        <div class="items-section">
                            <div class="items-title">You Get</div>
                            <div class="items-list">
                                ${autoTrade.receiving.map(item => {
                                    const itemId = item.id || item.itemId || '';
                                    const itemIdStr = itemId ? String(itemId) : '';
                                    const itemName = SecurityUtils.sanitizeHtml(item.name || 'Unknown Item');
                                    const itemNameShort = SecurityUtils.sanitizeHtml((item.name || 'UI').substring(0, 2).toUpperCase());
                                    return `<div class="item-icon" data-item-id="${SecurityUtils.sanitizeAttribute(itemIdStr)}" data-id="${SecurityUtils.sanitizeAttribute(itemIdStr)}" data-item-name="${SecurityUtils.sanitizeAttribute(item.name || '')}" title="${itemName}&#10;RAP ${(item.rap || 0).toLocaleString()}&#10;VAL ${(item.value || 0).toLocaleString()}">${itemNameShort}</div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="trade-meta">
                        <div class="trade-values">
                            <div class="value-section">
                                <div class="value-title">YOU</div>
                                <div class="value-details">
                                    <div class="rap-text">RAP ${yourRap.toLocaleString()}</div>
                                    <div class="val-text">VAL ${yourVal.toLocaleString()}</div>
                                </div>
                            </div>
                            <div class="value-section">
                                <div class="value-title">THEM</div>
                                <div class="value-details">
                                    <div class="rap-text">RAP ${theirRap.toLocaleString()}</div>
                                    <div class="val-text">VAL ${theirVal.toLocaleString()}</div>
                                </div>
                            </div>
                            <div class="value-section">
                                <div class="value-title">NET GAIN</div>
                                <div class="value-details">
                                    <div class="profit-text ${rapProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                                        ${rapProfit >= 0 ? '+' : ''}${rapProfit.toLocaleString()} RAP
                                    </div>
                                    <div class="profit-text ${valProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                                        ${valProfit >= 0 ? '+' : ''}${valProfit.toLocaleString()} VAL
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="trade-actions-inline" style="display: flex; flex-direction: column; gap: 6px; align-items: center; min-width: 32px; flex-shrink: 0;">
                            <button class="edit-auto-trade" data-trade-id="${autoTrade.id}" style="
                                background: transparent !important;
                                border: 1px solid #444 !important;
                                color: #fff !important;
                                width: 32px !important;
                                min-width: 32px !important;
                                height: 32px !important;
                                min-height: 32px !important;
                                border-radius: 6px !important;
                                cursor: pointer !important;
                                display: inline-flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                font-size: 14px !important;
                                padding: 0 !important;
                                box-shadow: none !important;
                                flex-shrink: 0 !important;
                                overflow: visible !important;
                            ">✏️</button>
                            <button class="delete-auto-trade" data-trade-id="${autoTrade.id}" style="
                                background: transparent !important;
                                border: 1px solid #444 !important;
                                color: #fff !important;
                                width: 32px !important;
                                min-width: 32px !important;
                                height: 32px !important;
                                min-height: 32px !important;
                                border-radius: 6px !important;
                                cursor: pointer !important;
                                display: inline-flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                font-size: 14px !important;
                                padding: 0 !important;
                                box-shadow: none !important;
                                flex-shrink: 0 !important;
                                overflow: visible !important;
                            ">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cards;

        const autoTradesContainer = DOM.$('#auto-trades-container');
        if (autoTradesContainer && window.TradeDisplayActions && window.TradeDisplayActions.handleAutoTradeActions) {
            autoTradesContainer.removeEventListener('click', window.TradeDisplayActions.handleAutoTradeActions);
            autoTradesContainer.addEventListener('click', window.TradeDisplayActions.handleAutoTradeActions);
        }

        const allItemIds = new Set();
        autoTrades.forEach(trade => {
            (trade.giving || []).forEach(item => {
                const itemId = item.id || item.itemId;
                if (itemId) allItemIds.add(String(itemId).trim());
            });
            (trade.receiving || []).forEach(item => {
                const itemId = item.id || item.itemId;
                if (itemId) allItemIds.add(String(itemId).trim());
            });
        });
        
        if (allItemIds.size > 0 && window.Thumbnails && window.Thumbnails.fetchBatch) {
            const itemIdsArray = Array.from(allItemIds);
            const batchSize = 100;
            for (let i = 0; i < itemIdsArray.length; i += batchSize) {
                const batch = itemIdsArray.slice(i, i + batchSize);
                Utils.delay(i / batchSize * 200).then(() => {
                    window.Thumbnails.fetchBatch(batch).catch(() => {});
                });
            }
        }

        Utils.nextFrame(() => {
            if (window.loadAutoTradeItemThumbnails) {
                window.loadAutoTradeItemThumbnails();
            }
        });
    }

    window.TradeDisplayAutoTrades = {
        displayAutoTrades
    };

    window.displayAutoTrades = displayAutoTrades;

})();