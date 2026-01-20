(function() {
    'use strict';

    function displayTrades(trades, containerId) {
        const container = document.getElementById(containerId);

        if (!container) return;

        const sortKey = `${containerId}SortOrder`;
        const sortOrder = Storage.get(sortKey, 'newest');
        
        let sortedTrades = [...trades];
        sortedTrades.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.created || 0).getTime();
            const dateB = new Date(b.timestamp || b.created || 0).getTime();
            return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
        });

        const tradesPerPage = 12;
        const currentPageKey = `${containerId}CurrentPage`;
        let currentPage = parseInt(Storage.get(currentPageKey, '1'));

        const totalPages = Math.max(1, Math.ceil(sortedTrades.length / tradesPerPage));
        if (currentPage > totalPages) {
            currentPage = totalPages;
            Storage.set(currentPageKey, currentPage.toString());
        }

        const startIndex = (currentPage - 1) * tradesPerPage;
        const endIndex = startIndex + tradesPerPage;
        const tradesToShow = sortedTrades.slice(startIndex, endIndex);
        
        const tradesKey = containerId.replace('-container', '') + 'Trades';
        window[tradesKey] = sortedTrades;

        container.innerHTML = '';

        if (trades.length === 0) {
            const paginationEl = document.getElementById(`${containerId.replace('-container', '')}-pagination`);
            if (paginationEl) paginationEl.style.display = 'none';
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-title">No Trades Found</div>
                    <div class="empty-state-text">
                        ${containerId.includes('completed') ? 'No completed trades yet.' :
                          containerId.includes('outbound') ? 'No outbound trades at the moment.' : 
                          containerId.includes('expired') ? 'No declined trades found.' :
                          containerId.includes('countered') ? 'No countered trades found.' : 'No trades found.'}
                    </div>
                </div>
            `;
            return;
        }

        const paginationEl = document.getElementById(`${containerId.replace('-container', '')}-pagination`);
        if (paginationEl) {
            paginationEl.style.display = 'flex';
            const currentSpan = paginationEl.querySelector(`#${containerId.replace('-container', '')}-pagination-current`);
            const totalSpan = paginationEl.querySelector(`#${containerId.replace('-container', '')}-pagination-total-pages`);
            const prevBtn = paginationEl.querySelector(`#${containerId.replace('-container', '')}-pagination-prev`);
            const nextBtn = paginationEl.querySelector(`#${containerId.replace('-container', '')}-pagination-next`);
            const sortBtn = paginationEl.querySelector(`#${containerId.replace('-container', '')}-sort-btn`);
            const sortIcon = paginationEl.querySelector(`#${containerId.replace('-container', '')}-sort-icon`);
            
            if (currentSpan) currentSpan.textContent = `Page ${currentPage}`;
            if (totalSpan) totalSpan.textContent = totalPages;
            if (prevBtn) {
                prevBtn.disabled = currentPage <= 1;
                prevBtn.onclick = () => {
                    if (currentPage > 1) {
                        Storage.set(currentPageKey, (currentPage - 1).toString());
                        const storedTrades = window[tradesKey] || trades;
                        displayTrades(storedTrades, containerId);
                    }
                };
            }
            if (nextBtn) {
                nextBtn.disabled = currentPage >= totalPages;
                nextBtn.onclick = () => {
                    if (currentPage < totalPages) {
                        Storage.set(currentPageKey, (currentPage + 1).toString());
                        const storedTrades = window[tradesKey] || trades;
                        displayTrades(storedTrades, containerId);
                    }
                };
            }
            if (sortBtn) {
                const currentSort = Storage.get(sortKey, 'newest');
                if (sortIcon) {
                    sortIcon.textContent = currentSort === 'oldest' ? '↓' : '↑';
                }
                sortBtn.innerHTML = `<span id="${containerId.replace('-container', '')}-sort-icon">${currentSort === 'oldest' ? '↓' : '↑'}</span> ${currentSort === 'oldest' ? 'Oldest First' : 'Newest First'}`;
                sortBtn.onclick = () => {
                    const newSort = currentSort === 'oldest' ? 'newest' : 'oldest';
                    Storage.set(sortKey, newSort);
                    Storage.set(currentPageKey, '1');
                    displayTrades(trades, containerId);
                };
            }
        }

        container.innerHTML = tradesToShow.map(trade => {
            const giving = Array.isArray(trade.giving) ? trade.giving : [];
            const receiving = Array.isArray(trade.receiving) ? trade.receiving : [];
            const robuxGive = Number(trade.robuxGive) || 0;
            const robuxGet = Number(trade.robuxGet) || 0;
            
            if ((giving.length > 0 || receiving.length > 0) || robuxGive > 0 || robuxGet > 0) {
                const yourRap = giving.reduce((sum, item) => sum + (item.rap || 0), 0) + robuxGive;
                const yourVal = giving.reduce((sum, item) => sum + (item.value || 0), 0) + robuxGive;
                const theirRap = receiving.reduce((sum, item) => sum + (item.rap || 0), 0) + robuxGet;
                const theirVal = receiving.reduce((sum, item) => sum + (item.value || 0), 0) + robuxGet;

                const rapProfit = theirRap - yourRap;
                const valProfit = theirVal - yourVal;

                let statusColor, statusText, statusBg;
                if (containerId.includes('completed') || containerId.includes('expired') || containerId.includes('countered')) {
                    if (trade.status === 'declined') {
                        statusColor = '#dc3545';
                        statusBg = 'rgba(220, 53, 69, 0.2)';
                        statusText = 'DECLINED';
                    } else if (trade.status === 'accepted') {
                        statusColor = '#28a745';
                        statusBg = 'rgba(40, 167, 69, 0.2)';
                        statusText = 'ACCEPTED';
                    } else if (trade.status === 'completed') {
                        statusColor = '#28a745';
                        statusBg = 'rgba(40, 167, 69, 0.2)';
                        statusText = 'COMPLETED';
                    } else if (trade.status === 'countered') {
                        statusColor = '#ff6b35';
                        statusBg = 'rgba(255, 107, 53, 0.2)';
                        statusText = 'COUNTERED';
                    } else {
                        statusColor = '#6c757d';
                        statusBg = 'rgba(108, 117, 125, 0.2)';
                        statusText = trade.status?.toUpperCase() || 'UNKNOWN';
                    }
                } else {
                    statusColor = '#ffc107';
                    statusBg = 'rgba(255, 193, 7, 0.2)';
                    statusText = 'OUTBOUND';
                }

                return `
                    <div class="trade-card" data-status="outbound">
                        <div class="trade-header">
                            <div class="trade-header-top">
                                <div class="trade-user">${SecurityUtils.sanitizeHtml(trade.user || `User ${trade.targetUserId}`)}</div>
                                <div class="trade-status" style="color: ${statusColor}; border-color: ${statusColor}; background: ${statusBg};">
                                    ${SecurityUtils.sanitizeHtml(statusText)}
                                </div>
                            </div>
                            <div class="trade-timestamp-header">${new Date(trade.timestamp || trade.created).toLocaleString()}</div>
                        </div>

                        <div class="trade-items">
                            <div class="items-section">
                                <div class="items-title">YOU GIVE</div>
                                <div class="items-list">
                                    ${giving.map(item => {
                                        const itemId = item.id || item.itemId;
                                        const itemIdStr = itemId ? String(itemId) : '';
                                        const itemName = SecurityUtils.sanitizeHtml(item.name || 'Unknown Item');
                                        const itemNameShort = SecurityUtils.sanitizeHtml((item.name || 'UI').substring(0, 2).toUpperCase());
                                        return `<div class="item-icon" data-item-id="${SecurityUtils.sanitizeAttribute(itemIdStr)}" data-id="${SecurityUtils.sanitizeAttribute(itemIdStr)}" data-item-name="${SecurityUtils.sanitizeAttribute(item.name || '')}" title="${itemName}&#10;RAP ${(item.rap || 0).toLocaleString()}&#10;VAL ${(item.value || 0).toLocaleString()}">${itemNameShort}</div>`;
                                    }).join('')}
                                    ${robuxGive > 0 ? `<div class="item-icon robux-icon" style="background: #00d26a; color: white; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center;" title="${robuxGive.toLocaleString()} Robux (${Math.floor(robuxGive * 0.7).toLocaleString()} after tax)">R${robuxGive >= 1000 ? (robuxGive / 1000).toFixed(1) + 'K' : robuxGive.toLocaleString()}</div>` : ''}
                                </div>
                            </div>

                            <div class="items-section">
                                <div class="items-title">YOU GET</div>
                                <div class="items-list">
                                    ${receiving.map(item => {
                                        const itemId = item.id || item.itemId;
                                        const itemIdStr = itemId ? String(itemId) : '';
                                        const itemName = SecurityUtils.sanitizeHtml(item.name || 'Unknown Item');
                                        const itemNameShort = SecurityUtils.sanitizeHtml((item.name || 'UI').substring(0, 2).toUpperCase());
                                        return `<div class="item-icon" data-item-id="${SecurityUtils.sanitizeAttribute(itemIdStr)}" data-id="${SecurityUtils.sanitizeAttribute(itemIdStr)}" data-item-name="${SecurityUtils.sanitizeAttribute(item.name || '')}" title="${itemName}&#10;RAP ${(item.rap || 0).toLocaleString()}&#10;VAL ${(item.value || 0).toLocaleString()}">${itemNameShort}</div>`;
                                    }).join('')}
                                    ${robuxGet > 0 ? `<div class="item-icon robux-icon" style="background: #00d26a; color: white; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center;" title="${robuxGet.toLocaleString()} Robux (${Math.floor(robuxGet * 0.7).toLocaleString()} after tax)">R${robuxGet >= 1000 ? (robuxGet / 1000).toFixed(1) + 'K' : robuxGet.toLocaleString()}</div>` : ''}
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
                        </div>
                    </div>
                `;
            } else {
                const statusColor = trade.status?.includes('Pending') ? '#ffc107' :
                                  trade.status === 'Expired' ? '#dc3545' :
                                  trade.status === 'Completed' ? '#28a745' : '#6c757d';

                return `
                    <div class="trade-card" data-status="${trade.status || 'unknown'}">
                        <div class="trade-header">
                            <div class="trade-user">User ID: ${SecurityUtils.sanitizeHtml(trade.targetUserId || 'Unknown')}</div>
                            <div class="trade-status" style="color: ${statusColor}; border-color: ${statusColor}; background: rgba(${
                                statusColor === '#28a745' ? '40, 167, 69' :
                                statusColor === '#ffc107' ? '255, 193, 7' :
                                statusColor === '#dc3545' ? '220, 53, 69' : '108, 117, 125'
                            }, 0.2);">
                                ${SecurityUtils.sanitizeHtml(trade.status || 'Unknown')}
                            </div>
                        </div>
                        <div class="trade-content">
                            <div class="trade-info">
                                <div><strong>Trade:</strong> ${SecurityUtils.sanitizeHtml(trade.tradeName || 'Extension Trade')}</div>
                                <div><strong>ID:</strong> ${SecurityUtils.sanitizeHtml(trade.id || 'Unknown')}</div>
                                <div><strong>Created:</strong> ${SecurityUtils.sanitizeHtml(trade.created || 'Unknown')}</div>
                                <div><strong>Type:</strong> ${SecurityUtils.sanitizeHtml(trade.type || 'Extension Trade')}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        function applyConsistentSizing() {
            const container = document.getElementById(containerId);
            if (!container) return;

            const tradeCards = container.querySelectorAll('.trade-card');
            tradeCards.forEach(card => {
                const itemsSections = card.querySelectorAll('.items-section');
                if (itemsSections.length === 2) {
                    const giveList = itemsSections[0].querySelector('.items-list');
                    const getList = itemsSections[1].querySelector('.items-list');
                    
                    if (giveList && getList) {
                        const giveItems = giveList.querySelectorAll('.item-icon:not(.robux-icon)').length;
                        const getItems = getList.querySelectorAll('.item-icon:not(.robux-icon)').length;
                        const maxItems = Math.max(giveItems, getItems, 1);
                        
                        [giveList, getList].forEach(list => {
                            list.classList.remove('items-2', 'items-3', 'items-4', 'items-5', 'items-6', 'items-7', 'items-8-plus');
                        });
                        
                        let sizeClass = '';
                        if (maxItems >= 8) {
                            sizeClass = 'items-8-plus';
                        } else if (maxItems === 7) {
                            sizeClass = 'items-7';
                        } else if (maxItems === 6) {
                            sizeClass = 'items-6';
                        } else if (maxItems === 5) {
                            sizeClass = 'items-5';
                        } else if (maxItems === 4) {
                            sizeClass = 'items-4';
                        } else if (maxItems === 3) {
                            sizeClass = 'items-3';
                        } else if (maxItems === 2) {
                            sizeClass = 'items-2';
                        } else {
                            sizeClass = 'items-2';
                        }
                        
                        if (sizeClass) {
                            giveList.classList.add(sizeClass);
                            getList.classList.add(sizeClass);
                        }
                    }
                }
            });
        }

        Utils.nextFrame(() => {
            applyConsistentSizing();
        });

        Utils.delay(100).then(() => {
            applyConsistentSizing();
        });

        Utils.delay(500).then(() => {
            applyConsistentSizing();
        });

        Utils.nextFrame(() => {
            if (window.loadAutoTradeItemThumbnails) {
                window.loadAutoTradeItemThumbnails(containerId);
            }
        });
    }

    window.TradeDisplayTrades = {
        displayTrades
    };

    window.displayTrades = displayTrades;

})();