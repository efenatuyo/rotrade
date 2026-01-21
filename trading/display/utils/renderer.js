(function() {
    'use strict';

    const { SecurityUtils, TradeDisplayCore } = window;
    const itemCache = new WeakMap();
    const robuxCache = new Map();

    const normId = (i) => i.id || i.itemId || '';
    const normName = (i) => i.name || 'Unknown Item';
    const shortName = (i) => normName(i).substring(0, 2).toUpperCase();
    const tooltip = (i) => {
        const name = SecurityUtils.sanitizeHtml(normName(i));
        const rap = TradeDisplayCore.formatNum(i.rap || 0);
        const val = TradeDisplayCore.formatNum(i.value || 0);
        return `${name}&#10;RAP ${rap}&#10;VAL ${val}`;
    };

    const renderItem = (item, variant = 'default') => {
        if (!item || typeof item !== 'object') return '';
        const cacheKey = `${normId(item)}:${variant}`;
        const cachedMap = itemCache.get(item) || new Map();
        if (cachedMap.has(cacheKey)) {
            return cachedMap.get(cacheKey);
        }
        const id = String(normId(item));
        const name = SecurityUtils.sanitizeHtml(normName(item));
        const short = SecurityUtils.sanitizeHtml(shortName(item));
        const tip = tooltip(item);
        const sid = SecurityUtils.sanitizeAttribute(id);
        const sname = SecurityUtils.sanitizeAttribute(item.name || '');
        const displayName = normName(item);
        const truncatedName = displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName;
        const html = variant === 'compact' 
            ? `<div class="item-card-compact"><div class="item-icon" data-item-id="${sid}" data-id="${sid}" data-item-name="${sname}" title="${tip}">${short}</div><div class="item-info-compact"><div class="item-name-compact">${SecurityUtils.sanitizeHtml(truncatedName)}</div><div class="item-values-compact"><span class="rap-text">RAP: ${TradeDisplayCore.formatNum(item.rap || 0)}</span><span class="value-text">VAL: ${TradeDisplayCore.formatNum(item.value || 0)}</span></div></div></div>`
            : `<div class="item-icon" data-item-id="${sid}" data-id="${sid}" data-item-name="${sname}" title="${tip}">${short}</div>`;
        cachedMap.set(cacheKey, html);
        itemCache.set(item, cachedMap);
        return html;
    };

    const renderRobux = (r, variant = 'icon') => {
        if (!r || r <= 0) return '';
        const amt = Number(r);
        const key = `${amt}:${variant}`;
        if (robuxCache.has(key)) return robuxCache.get(key);
        const formatted = TradeDisplayCore.formatRobux(amt);
        const afterTax = Math.floor(amt * 0.7);
        const taxText = `${TradeDisplayCore.formatNum(amt)} Robux (${TradeDisplayCore.formatNum(afterTax)} after tax)`;
        const html = variant === 'compact'
            ? `<div class="item-card-compact" style="margin-top: 8px;"><div class="item-icon" style="background: #00d26a; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">R$</div><div class="item-info-compact"><div class="item-name-compact">${TradeDisplayCore.formatNum(amt)} Robux</div><div class="item-values-compact" style="color: #888; font-size: 11px;">(${TradeDisplayCore.formatNum(afterTax)} robux after tax)</div></div></div>`
            : `<div class="item-icon robux-icon" style="background: #00d26a; color: white; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center;" title="${taxText}">R${formatted}</div>`;
        robuxCache.set(key, html);
        return html;
    };

    const renderItems = (items, robux = 0, variant = 'default') => {
        const itemsArray = Array.isArray(items) ? items : [];
        return itemsArray.map(i => renderItem(i, variant)).join('') + renderRobux(robux, variant);
    };

    const renderHeader = (trade, statusConfig) => {
        const user = SecurityUtils.sanitizeHtml(trade.user || `User ${trade.targetUserId}`);
        const status = SecurityUtils.sanitizeHtml(statusConfig.text);
        const time = TradeDisplayCore.formatDate(trade.timestamp || trade.created);
        const style = `color: ${statusConfig.color}; border-color: ${statusConfig.color}; background: ${statusConfig.bg};`;
        return `<div class="trade-header"><div class="trade-header-top"><div class="trade-user">${user}</div><div class="trade-status" style="${style}">${status}</div></div><div class="trade-timestamp-header">${time}</div></div>`;
    };

    const renderSection = (title, items, robux, variant = 'default') => {
        return `<div class="items-section"><div class="items-title">${title}</div><div class="items-list">${renderItems(items, robux, variant)}</div></div>`;
    };

    const renderValues = (values) => {
        const fmt = TradeDisplayCore.formatNum;
        const prof = TradeDisplayCore.formatProfit;
        return `<div class="trade-meta"><div class="trade-values"><div class="value-section"><div class="value-title">YOU</div><div class="value-details"><div class="rap-text">RAP ${fmt(values.yourRap)}</div><div class="val-text">VAL ${fmt(values.yourVal)}</div></div></div><div class="value-section"><div class="value-title">THEM</div><div class="value-details"><div class="rap-text">RAP ${fmt(values.theirRap)}</div><div class="val-text">VAL ${fmt(values.theirVal)}</div></div></div><div class="value-section"><div class="value-title">NET GAIN</div><div class="value-details"><div class="profit-text ${values.rapProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${prof(values.rapProfit)} RAP</div><div class="profit-text ${values.valProfit >= 0 ? 'profit-positive' : 'profit-negative'}">${prof(values.valProfit)} VAL</div></div></div></div></div>`;
    };

    const renderFullCard = (trade, containerId) => {
        const v = TradeDisplayCore.calcValues(trade);
        const s = TradeDisplayCore.getStatusConfig(trade.status, containerId);
        return `<div class="trade-card" data-status="outbound">${renderHeader(trade, s)}<div class="trade-items">${renderSection('YOU GIVE', v.giving, v.robuxGive)}${renderSection('YOU GET', v.receiving, v.robuxGet)}</div>${renderValues(v)}</div>`;
    };

    const renderSimpleCard = (trade) => {
        const sc = trade.status?.includes('Pending') ? '#ffc107' : trade.status === 'Expired' ? '#dc3545' : trade.status === 'Completed' ? '#28a745' : '#6c757d';
        const bg = sc === '#28a745' ? 'rgba(40, 167, 69, 0.2)' : sc === '#ffc107' ? 'rgba(255, 193, 7, 0.2)' : sc === '#dc3545' ? 'rgba(220, 53, 69, 0.2)' : 'rgba(108, 117, 125, 0.2)';
        const s = SecurityUtils.sanitizeHtml(trade.status || 'Unknown');
        const uid = SecurityUtils.sanitizeHtml(trade.targetUserId || 'Unknown');
        const tn = SecurityUtils.sanitizeHtml(trade.tradeName || 'Extension Trade');
        const tid = SecurityUtils.sanitizeHtml(trade.id || 'Unknown');
        const cr = SecurityUtils.sanitizeHtml(trade.created || 'Unknown');
        const ty = SecurityUtils.sanitizeHtml(trade.type || 'Extension Trade');
        return `<div class="trade-card" data-status="${trade.status || 'unknown'}"><div class="trade-header"><div class="trade-user">User ID: ${uid}</div><div class="trade-status" style="color: ${sc}; border-color: ${sc}; background: ${bg};">${s}</div></div><div class="trade-content"><div class="trade-info"><div><strong>Trade:</strong> ${tn}</div><div><strong>ID:</strong> ${tid}</div><div><strong>Created:</strong> ${cr}</div><div><strong>Type:</strong> ${ty}</div></div></div></div>`;
    };

    const renderCard = (trade, containerId) => {
        return TradeDisplayCore.hasItems(trade) ? renderFullCard(trade, containerId) : renderSimpleCard(trade);
    };

    window.TradeDisplayRenderer = {
        renderItem, renderRobux, renderItems, renderHeader, renderSection,
        renderValues, renderFullCard, renderSimpleCard, renderCard
    };

})();
