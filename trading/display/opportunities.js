(function() {
    'use strict';

    async function displayTradeOpportunities(opportunities) {
        const grid = DOM.$('#send-trades-grid');
        if (!grid) return;

        if (opportunities.length === 0) {
            if (window.filteredOpportunities && window.filteredOpportunities.length > 0) {
                const totalPages = Pagination.getTotalPages();
                const currentPage = Pagination.getCurrentPage();
                if (currentPage > 1 && currentPage <= totalPages) {
                    Pagination.setCurrentPage(currentPage - 1);
                    Pagination.displayCurrentPage();
                    return;
                }
            }
            
            const autoTrades = Storage.get('autoTrades', []);
            if (autoTrades.length === 0) {
                grid.innerHTML = '<div class="empty-message">No auto-trades available. Create some auto-trades first!</div>';
                return;
            }

            const allTradesComplete = autoTrades.every(trade => {
                const maxTrades = trade.settings?.maxTrades || 5;
                const tradesExecutedToday = Trades.getTodayTradeCount(trade.id);
                return tradesExecutedToday >= maxTrades;
            });

            if (allTradesComplete) {
                grid.innerHTML = '<div class="empty-message">All trades completed for today!</div>';
                return;
            }

            grid.innerHTML = '<div class="empty-message">No trading opportunities found.</div>';
            return;
        }

        let rolimonData = {};
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'fetchRolimons'
            });
            if (response.success) {
                rolimonData = response.data.items || {};
            }
        } catch (error) {
        }

        let tradesToShow = opportunities;
        
        if (opportunities === window.filteredOpportunities) {
            const currentPage = Pagination.getCurrentPage();
            const tradesPerPage = Pagination.getTradesPerPage();
            const startIndex = (currentPage - 1) * tradesPerPage;
            const endIndex = startIndex + tradesPerPage;
            tradesToShow = opportunities.slice(startIndex, endIndex);
        }

        if (Object.keys(rolimonData).length > 0) {
            tradesToShow = tradesToShow.map(opportunity => {
                const enrichedGiving = opportunity.giving.map(item => {
                    const itemName = (item.name || '').trim();
                    if (!itemName) return item;
                    
                    const rolimonEntry = Object.entries(rolimonData).find(([id, data]) => {
                        if (!Array.isArray(data) || data.length < 5) return false;
                        const rolimonName = (data[0] || '').trim();
                        return rolimonName.toLowerCase() === itemName.toLowerCase();
                    });
                    
                    if (rolimonEntry) {
                        const [itemId, rolimonItem] = rolimonEntry;
                        return {
                            ...item,
                            id: parseInt(itemId) || item.id || item.itemId,
                            itemId: parseInt(itemId) || item.id || item.itemId,
                            rap: item.rap || rolimonItem[2],
                            value: item.value || rolimonItem[4]
                        };
                    }
                    return item;
                });

                const enrichedReceiving = opportunity.receiving.map(item => {
                    const itemName = (item.name || '').trim();
                    if (!itemName) return item;
                    
                    const rolimonEntry = Object.entries(rolimonData).find(([id, data]) => {
                        if (!Array.isArray(data) || data.length < 5) return false;
                        const rolimonName = (data[0] || '').trim();
                        return rolimonName.toLowerCase() === itemName.toLowerCase();
                    });
                    
                    if (rolimonEntry) {
                        const [itemId, rolimonItem] = rolimonEntry;
                        return {
                            ...item,
                            id: parseInt(itemId) || item.id || item.itemId,
                            itemId: parseInt(itemId) || item.id || item.itemId,
                            rap: item.rap || rolimonItem[2],
                            value: item.value || rolimonItem[4]
                        };
                    }
                    return item;
                });

                return {
                    ...opportunity,
                    giving: enrichedGiving,
                    receiving: enrichedReceiving
                };
            });
        }

        grid.innerHTML = tradesToShow.map(opportunity => {
            const givingItems = opportunity.giving.map(item =>
                `<div class="item-card-compact">
                    <div class="item-icon" data-item-id="${item.id || item.itemId || ''}" data-id="${item.id || item.itemId || ''}" data-item-name="${item.name || ''}" title="${item.name || 'Unknown Item'}&#10;RAP ${(item.rap || 0).toLocaleString()}&#10;VAL ${(item.value || 0).toLocaleString()}">${(item.name || 'UI').substring(0, 2).toUpperCase()}</div>
                    <div class="item-info-compact">
                        <div class="item-name-compact">${item.name && item.name.length > 15 ? item.name.substring(0, 15) + '...' : (item.name || 'Unknown Item')}</div>
                        <div class="item-values-compact">
                            <span class="rap-text">RAP: ${(item.rap || 0).toLocaleString()}</span>
                            <span class="value-text">VAL: ${(item.value || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>`
            ).join('');

            const receivingItems = opportunity.receiving.map(item =>
                `<div class="item-card-compact">
                    <div class="item-icon" data-item-id="${item.id || item.itemId || ''}" data-id="${item.id || item.itemId || ''}" data-item-name="${item.name || ''}" title="${item.name || 'Unknown Item'}&#10;RAP ${(item.rap || 0).toLocaleString()}&#10;VAL ${(item.value || 0).toLocaleString()}">${(item.name || 'UI').substring(0, 2).toUpperCase()}</div>
                    <div class="item-info-compact">
                        <div class="item-name-compact">${item.name && item.name.length > 15 ? item.name.substring(0, 15) + '...' : (item.name || 'Unknown Item')}</div>
                        <div class="item-values-compact">
                            <span class="rap-text">RAP: ${(item.rap || 0).toLocaleString()}</span>
                            <span class="value-text">VAL: ${(item.value || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>`
            ).join('');

            let robuxGetHtml = '';
            if (opportunity.robuxGet && opportunity.robuxGet > 0) {
                const afterTaxRobux = Math.floor(opportunity.robuxGet * 0.7);
                robuxGetHtml = `
                    <div class="item-card-compact" style="margin-top: 8px;">
                        <div class="item-icon" style="background: #00d26a; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">R$</div>
                        <div class="item-info-compact">
                            <div class="item-name-compact">${opportunity.robuxGet.toLocaleString()} Robux</div>
                            <div class="item-values-compact" style="color: #888; font-size: 11px;">
                                (${afterTaxRobux.toLocaleString()} robux after tax)
                            </div>
                        </div>
                    </div>
                `;
            }

            let robuxGiveHtml = '';
            if (opportunity.robuxGive && opportunity.robuxGive > 0) {
                const afterTaxRobux = Math.floor(opportunity.robuxGive * 0.7);
                robuxGiveHtml = `
                    <div class="item-card-compact" style="margin-top: 8px;">
                        <div class="item-icon" style="background: #00d26a; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">R$</div>
                        <div class="item-info-compact">
                            <div class="item-name-compact">${opportunity.robuxGive.toLocaleString()} Robux</div>
                            <div class="item-values-compact" style="color: #888; font-size: 11px;">
                                (${afterTaxRobux.toLocaleString()} robux after tax)
                            </div>
                        </div>
                    </div>
                `;
            }

            let lastOnlineHtml = '';
            let daysOwnedHtml = '';
            
            if (window.ownersRawData && window.ownersRawData[opportunity.id]) {
                const userData = window.ownersRawData[opportunity.id].find(u => u.userId === opportunity.targetUserId);
                
                if (userData) {
                    const now = Date.now();
                    const daysOwned = Math.floor((now - userData.ownedSince) / (1000 * 60 * 60 * 24));
                    const lastOnlineMs = userData.lastOnline * 1000;
                    const diffMs = now - lastOnlineMs;
                    const daysOnline = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const hoursOnline = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutesOnline = Math.floor(diffMs / (1000 * 60));

                    let onlineText = '';
                    if (daysOnline > 0) {
                        onlineText = `${daysOnline}d ago`;
                    } else if (hoursOnline > 0) {
                        onlineText = `${hoursOnline}h ago`;
                    } else {
                        onlineText = `${minutesOnline}m ago`;
                    }

                    lastOnlineHtml = `<div class="user-stat-line" style="font-size: 12px; color: #bdbebe6c;">Last Online: ${onlineText}</div>`;
                    daysOwnedHtml = `<div class="user-stat-line" style="font-size: 12px; color: #bdbebe6c;">Owned Since: ${daysOwned}d</div>`;
                }
            }

            return `
                <div class="send-trade-card trade-card">
                    <div class="send-trade-header">
                        <div class="trade-info-compact">
                            <div class="trade-title-compact">${opportunity.name}</div>
                            <div class="trade-target">→ ${opportunity.targetUser.username}</div>
                            ${lastOnlineHtml}
                            ${daysOwnedHtml}
                        </div>
                        <div class="header-right-section">
                            <img src="${opportunity.targetUser.avatarUrl}" alt="${opportunity.targetUser.username}" class="user-avatar-compact" style="opacity: 0.7;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiByeD0iNCIgZmlsbD0iIzMzMzMzMyIvPgo8Y2lyY2xlIGN4PSIxNSIgY3k9IjEyIiByPSI0IiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik04IDI0QzggMjAuNjg2MyAxMS4xMzQgMTggMTUgMThDMTguODY2IDE4IDIyIDIwLjY4NjMgMjIgMjRIOFoiIGZpbGw9IiM2NjY2NjYiLz4KPC9zdmc+Cg=='" />
                        </div>
                    </div>

                    <div class="trade-content-compact">
                        <div class="trade-section-compact">
                            <div class="section-title-compact">GIVE</div>
                            <div class="trade-items-compact">
                                ${givingItems}
                                ${robuxGiveHtml}
                            </div>
                        </div>

                        <div class="trade-section-compact">
                            <div class="section-title-compact">GET</div>
                            <div class="trade-items-compact">
                                ${receivingItems}
                                ${robuxGetHtml}
                            </div>
                        </div>
                    </div>

                    <div class="send-trade-actions">
                        <button class="btn btn-success btn-sm send-trade-btn" data-user-id="${opportunity.targetUserId}" data-trade-id="${opportunity.id}">
                            SEND
                        </button>
                        <a href="https://www.roblox.com/users/${opportunity.targetUserId}/profile" target="_blank" class="btn btn-secondary btn-sm">
                            PROFILE
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        const allItemIds = new Set();
        tradesToShow.forEach(opportunity => {
            (opportunity.giving || []).forEach(item => {
                const itemId = item.id || item.itemId;
                if (itemId) allItemIds.add(String(itemId).trim());
            });
            (opportunity.receiving || []).forEach(item => {
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
                window.loadAutoTradeItemThumbnails('send-trades-grid');
            }
            if (window.loadUserAvatars) {
                window.loadUserAvatars();
            }
        });

        if (window.setupSendTradeButtons) {
            window.setupSendTradeButtons();
        }
        Pagination.updatePaginationControls();
    }

    window.TradeDisplayOpportunities = {
        displayTradeOpportunities
    };

    window.displayTradeOpportunities = displayTradeOpportunities;

})();