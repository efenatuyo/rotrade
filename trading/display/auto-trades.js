(function() {
    'use strict';

    const { SecurityUtils, TradeDisplayCore, TradeDisplayRenderer, Utils, DOM } = window;

    function displayAutoTrades(autoTrades) {
        const container = document.getElementById('auto-trades-container');
        const emptyState = document.getElementById('empty-state');
        const autoTradesSection = document.getElementById('auto-trades-section');

        if (!container) return;

        const isVisible = autoTradesSection && window.getComputedStyle(autoTradesSection).display !== 'none';

        if (autoTrades.length === 0) {
            container.style.display = 'grid';
            container.innerHTML = '';
            if (emptyState && isVisible) {
                container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-state-icon">🤖</div><div class="empty-state-title">No Auto Trades Yet</div><div class="empty-state-text">Create your first automated trade to get started.<br>Set up trades to run automatically and maximize your trading efficiency.</div></div>`;
            }
            if (emptyState) emptyState.style.display = 'none';
            return;
        }

        container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        const cards = autoTrades.map(autoTrade => {
            const values = TradeDisplayCore.calcValues(autoTrade);
            const maxTrades = autoTrade.settings?.maxTrades || autoTrade.settings?.maxTradesPerDay || 5;
            const tradesExecutedToday = Trades.getTodayTradeCount(autoTrade.id);
            const isComplete = tradesExecutedToday >= maxTrades;
            const statusIcon = isComplete ? '✅' : '⏳';
            const statusText = isComplete ? `COMPLETE (${tradesExecutedToday}/${maxTrades})` : `INCOMPLETE (${tradesExecutedToday}/${maxTrades})`;

            return `<div class="auto-trade-card" data-status="${autoTrade.status}" data-id="${autoTrade.id}"><div class="auto-trade-header"><div class="auto-trade-name">${SecurityUtils.sanitizeHtml(autoTrade.name)}</div><div class="auto-trade-status status-${autoTrade.status}">${statusIcon} ${statusText}</div></div><div class="auto-trade-items">${TradeDisplayRenderer.renderSection('You Give', values.giving, values.robuxGive)}${TradeDisplayRenderer.renderSection('You Get', values.receiving, values.robuxGet)}</div><div class="trade-meta"><div class="trade-values"><div class="value-section"><div class="value-title">YOU</div><div class="value-details"><div class="rap-text">RAP ${TradeDisplayCore.formatNum(values.yourRap)}</div><div class="val-text">VAL ${TradeDisplayCore.formatNum(values.yourVal)}</div></div></div><div class="value-section"><div class="value-title">THEM</div><div class="value-details"><div class="rap-text">RAP ${TradeDisplayCore.formatNum(values.theirRap)}</div><div class="val-text">VAL ${TradeDisplayCore.formatNum(values.theirVal)}</div></div></div><div class="value-section"><div class="value-title">NET GAIN</div><div class="value-details"><div class="profit-text ${values.rapProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${TradeDisplayCore.formatProfit(values.rapProfit)} RAP</div><div class="profit-text ${values.valProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${TradeDisplayCore.formatProfit(values.valProfit)} VAL</div></div></div></div><div class="trade-actions-inline" style="display: flex; flex-direction: column; gap: 6px; align-items: center; min-width: 32px; flex-shrink: 0;"><button class="edit-auto-trade" data-trade-id="${autoTrade.id}" style="background: transparent !important; border: 1px solid #444 !important; color: #fff !important; width: 32px !important; min-width: 32px !important; height: 32px !important; min-height: 32px !important; border-radius: 6px !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; font-size: 14px !important; padding: 0 !important; box-shadow: none !important; flex-shrink: 0 !important; overflow: visible !important;">✏️</button><button class="delete-auto-trade" data-trade-id="${autoTrade.id}" style="background: transparent !important; border: 1px solid #444 !important; color: #fff !important; width: 32px !important; min-width: 32px !important; height: 32px !important; min-height: 32px !important; border-radius: 6px !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; font-size: 14px !important; padding: 0 !important; box-shadow: none !important; flex-shrink: 0 !important; overflow: visible !important;">🗑️</button></div></div></div>`;
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

    window.TradeDisplayAutoTrades = { displayAutoTrades };
    window.displayAutoTrades = displayAutoTrades;

})();
