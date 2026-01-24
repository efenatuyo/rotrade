(function() {
    'use strict';

    const { SecurityUtils, TradeDisplayCore, TradeDisplayRenderer, Utils, Storage, DOM } = window;

    async function displayTradeOpportunities(opportunities) {
        const grid = DOM.$('#send-trades-grid');
        if (!grid) return;

        if (opportunities.length === 0) {
            if (window.filteredOpportunities && window.filteredOpportunities.length > 0) {
                const totalPages = Pagination.getTotalPages();
                Pagination.getCurrentPage().then(currentPage => {
                    if (currentPage > 1 && currentPage <= totalPages) {
                        Pagination.setCurrentPage(currentPage - 1);
                        Pagination.displayCurrentPage().catch(() => {});
                    }
                }).catch(() => {});
                return;
            }
            
            let autoTrades = [];
            if (Storage.getCurrentAccountId && Storage.getCurrentAccountId()) {
                autoTrades = Storage.getAccount('autoTrades', []);
            } else if (window.API && window.API.getCurrentUserId) {
                const userId = window.API.getCurrentUserIdSync ? window.API.getCurrentUserIdSync() : (await window.API.getCurrentUserId());
                if (userId) {
                    Storage.setCurrentAccountId(userId);
                    autoTrades = Storage.getAccount('autoTrades', []);
                }
            }
            if (autoTrades.length === 0) {
                grid.innerHTML = '<div class="empty-message">No auto-trades available. Create some auto-trades first!</div>';
                return;
            }

            const activeFilter = document.querySelector('.trade-filter-chip.active');
            const isAllTrades = !activeFilter || activeFilter.dataset.tradeName === 'all';

            if (!isAllTrades && activeFilter) {
                const tradeId = activeFilter.dataset.tradeId;
                const specificTrade = autoTrades.find(t => String(t.id) === String(tradeId));
                if (specificTrade) {
                    const maxTrades = specificTrade.settings?.maxTrades || 5;
                    const tradesExecutedToday = Trades.getTodayTradeCount(specificTrade.id);
                    if (tradesExecutedToday >= maxTrades) {
                        grid.innerHTML = '<div class="empty-message">All trades have been sent. Wait for another day or change the daily amount.</div>';
                        return;
                    }
                }
            }

            const isSendingAllTrades = window.SendAllTrades && typeof window.SendAllTrades.isSendingAllTrades === 'function' && window.SendAllTrades.isSendingAllTrades();
            
            if (!isSendingAllTrades) {
                const allTradesComplete = autoTrades.every(trade => {
                    const maxTrades = trade.settings?.maxTrades || 5;
                    const tradesExecutedToday = Trades.getTodayTradeCount(trade.id);
                    return tradesExecutedToday >= maxTrades;
                });

                if (allTradesComplete) {
                    grid.innerHTML = '<div class="empty-message">All trades completed for today!</div>';
                    return;
                }
            }

            grid.innerHTML = '<div class="empty-message">No trading opportunities found.</div>';
            return;
        }

        let rolimonData = {};
        try {
            const response = await chrome.runtime.sendMessage({ action: 'fetchRolimons' });
            if (response.success) {
                rolimonData = response.data.items || {};
            }
        } catch (error) {
        }

        let tradesToShow = opportunities;
        
        if (opportunities === window.filteredOpportunities) {
            const currentPage = await Pagination.getCurrentPage();
            const tradesPerPage = Pagination.getTradesPerPage();
            const startIndex = (currentPage - 1) * tradesPerPage;
            const endIndex = startIndex + tradesPerPage;
            tradesToShow = opportunities.slice(startIndex, endIndex);
        }

        if (Object.keys(rolimonData).length > 0) {
            const rolimonLookup = new Map();
            for (const [itemId, itemData] of Object.entries(rolimonData)) {
                if (Array.isArray(itemData) && itemData.length >= 5) {
                    const rolimonName = (itemData[0] || '').trim().toLowerCase();
                    if (rolimonName) {
                        rolimonLookup.set(rolimonName, { itemId: parseInt(itemId) || 0, itemData });
                    }
                }
            }

            const enrichItem = (item) => {
                const itemName = (item.name || '').trim();
                if (!itemName) return item;
                
                const lookup = rolimonLookup.get(itemName.toLowerCase());
                if (lookup) {
                    return {
                        ...item,
                        id: lookup.itemId || item.id || item.itemId,
                        itemId: lookup.itemId || item.id || item.itemId,
                        rap: item.rap || lookup.itemData[2],
                        value: item.value || lookup.itemData[4]
                    };
                }
                return item;
            };

            tradesToShow = tradesToShow.map(opportunity => ({
                ...opportunity,
                giving: opportunity.giving.map(enrichItem),
                receiving: opportunity.receiving.map(enrichItem)
            }));
        }

        grid.innerHTML = tradesToShow.map(opportunity => {
            if (!opportunity) return '';
            const giving = Array.isArray(opportunity.giving) ? opportunity.giving : [];
            const receiving = Array.isArray(opportunity.receiving) ? opportunity.receiving : [];
            const givingItems = TradeDisplayRenderer.renderItems(giving, 0, 'compact');
            const receivingItems = TradeDisplayRenderer.renderItems(receiving, 0, 'compact');
            const robuxGetHtml = TradeDisplayRenderer.renderRobux(opportunity.robuxGet, 'compact');
            const robuxGiveHtml = TradeDisplayRenderer.renderRobux(opportunity.robuxGive, 'compact');

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

            const avatarUrl = SecurityUtils.sanitizeUrl(opportunity.targetUser.avatarUrl);
            const username = SecurityUtils.sanitizeAttribute(opportunity.targetUser.username);
            const fallbackImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiByeD0iNCIgZmlsbD0iIzMzMzMzMyIvPgo8Y2lyY2xlIGN4PSIxNSIgY3k9IjEyIiByPSI0IiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik04IDI0QzggMjAuNjg2MyAxMS4xMzQgMTggMTUgMThDMTguODY2IDE4IDIyIDIwLjY4NjMgMjIgMjRIOFoiIGZpbGw9IiM2NjY2NjYiLz4KPC9zdmc+Cg==';
            const avatarHtml = avatarUrl ? `<img src="${SecurityUtils.sanitizeAttribute(avatarUrl)}" alt="${username}" class="user-avatar-compact" style="opacity: 0.7;" onerror="this.src='${fallbackImg}'" />` : `<img src="${fallbackImg}" alt="${username}" class="user-avatar-compact" style="opacity: 0.7;" />`;

            return `<div class="send-trade-card trade-card"><div class="send-trade-header"><div class="trade-info-compact"><div class="trade-title-compact">${SecurityUtils.sanitizeHtml(opportunity.name)}</div><div class="trade-target">→ ${SecurityUtils.sanitizeHtml(opportunity.targetUser.username)}</div>${lastOnlineHtml}${daysOwnedHtml}</div><div class="header-right-section">${avatarHtml}</div></div><div class="trade-content-compact"><div class="trade-section-compact"><div class="section-title-compact">GIVE</div><div class="trade-items-compact">${givingItems}${robuxGiveHtml}</div></div><div class="trade-section-compact"><div class="section-title-compact">GET</div><div class="trade-items-compact">${receivingItems}${robuxGetHtml}</div></div></div><div class="send-trade-actions"><button class="btn btn-success btn-sm send-trade-btn" data-user-id="${SecurityUtils.sanitizeAttribute(opportunity.targetUserId)}" data-trade-id="${SecurityUtils.sanitizeAttribute(opportunity.id)}">SEND</button><a href="https://www.roblox.com/users/${SecurityUtils.sanitizeAttribute(opportunity.targetUserId)}/profile" target="_blank" class="btn btn-secondary btn-sm" rel="noopener noreferrer">PROFILE</a></div></div>`;
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
        Pagination.updatePaginationControls().catch(() => {});
    }

    window.TradeDisplayOpportunities = { displayTradeOpportunities };
    window.displayTradeOpportunities = displayTradeOpportunities;

})();
