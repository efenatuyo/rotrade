(function() {
    'use strict';

    let progressDialog = null;

    function renderAllItemsThumbnails(items, container) {
        if (!container) return;
        
        if (!items || items.length === 0) {
            container.innerHTML = '<span style="color: #bdbebe;">No items</span>';
            return;
        }

        if (!window.thumbnailCache) {
            window.thumbnailCache = {};
            try {
                const stored = localStorage.getItem('thumbnailCache');
                if (stored) {
                    window.thumbnailCache = JSON.parse(stored);
                }
            } catch {}
        }

        const itemIds = items.map(item => String(item.id || item.itemId || '')).filter(id => id && id !== 'undefined' && id !== 'null' && id !== '0');
        const uniqueItemIds = [...new Set(itemIds)];
        
        const thumbnailHtml = items.map((item) => {
            const itemId = String(item.id || item.itemId || '');
            if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId === '0') {
                return '';
            }
            
            const cachedUrl = window.thumbnailCache?.[itemId] || null;
            
            return `
                <div class="item-icon" data-item-id="${itemId}" data-id="${itemId}" style="
                    width: 36px;
                    height: 36px;
                    border-radius: 6px;
                    border: 2px solid #4a4c4e;
                    overflow: hidden;
                    background: #2a2d30;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    flex-shrink: 0;
                ">
                    ${cachedUrl ? `<img src="${cachedUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block;">` : ''}
                </div>
            `;
        }).filter(html => html).join('');

        container.innerHTML = thumbnailHtml;
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '4px';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.minHeight = '40px';

        if (window.Thumbnails && window.Thumbnails.fetchBatch && uniqueItemIds.length > 0) {
            window.Thumbnails.fetchBatch(uniqueItemIds).then(() => {
                if (window.Thumbnails && window.Thumbnails.loadForElements) {
                    const itemIcons = container.querySelectorAll('.item-icon');
                    window.Thumbnails.loadForElements(Array.from(itemIcons));
                }
            }).catch(() => {});
        } else if (window.Thumbnails && window.Thumbnails.loadForElements) {
            const itemIcons = container.querySelectorAll('.item-icon');
            window.Thumbnails.loadForElements(Array.from(itemIcons));
        }
    }

    function renderItemsByTradeSetting(opportunities, container, itemType, isAllTrades = false) {
        if (!container || !opportunities || opportunities.length === 0) {
            container.innerHTML = '<span style="color: #bdbebe;">No items</span>';
            return;
        }

        if (!isAllTrades) {
            const opportunity = opportunities[0];
            if (!opportunity) {
                container.innerHTML = '<span style="color: #bdbebe;">No items</span>';
                return;
            }
            const items = itemType === 'giving' ? (opportunity.giving || []) : (opportunity.receiving || []);
            renderAllItemsThumbnails(items, container);
            return;
        }

        const groupedByTrade = new Map();
        opportunities.forEach(opp => {
            const tradeConfigId = String(opp.id || '');
            if (!tradeConfigId || tradeConfigId === 'undefined' || tradeConfigId === 'null') {
                return;
            }
            
            if (!groupedByTrade.has(tradeConfigId)) {
                const items = itemType === 'giving' ? (opp.giving || []) : (opp.receiving || []);
                groupedByTrade.set(tradeConfigId, {
                    tradeId: tradeConfigId,
                    tradeName: opp.name || 'Unknown Trade',
                    items: items
                });
            }
        });

        if (!window.thumbnailCache) {
            window.thumbnailCache = {};
            try {
                const stored = localStorage.getItem('thumbnailCache');
                if (stored) {
                    window.thumbnailCache = JSON.parse(stored);
                }
            } catch {}
        }

        const allItemIds = Array.from(groupedByTrade.values()).flatMap(group => 
            group.items.map(item => String(item.id || item.itemId || '')).filter(id => id && id !== 'undefined' && id !== 'null' && id !== '0')
        );
        const uniqueItemIds = [...new Set(allItemIds)];

        const groupsHtml = Array.from(groupedByTrade.values()).map((group, groupIndex) => {
            const itemsHtml = group.items.map((item) => {
                const itemId = String(item.id || item.itemId || '');
                if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId === '0') {
                    return '';
                }
                
                const cachedUrl = window.thumbnailCache?.[itemId] || null;
                
                return `
                    <div class="item-icon" data-item-id="${SecurityUtils.sanitizeAttribute(itemId)}" data-id="${SecurityUtils.sanitizeAttribute(itemId)}" style="
                        width: 36px;
                        height: 36px;
                        border-radius: 6px;
                        border: 2px solid #4a4c4e;
                        overflow: hidden;
                        background: #2a2d30;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                        flex-shrink: 0;
                    ">
                        ${cachedUrl ? `<img src="${SecurityUtils.sanitizeAttribute(SecurityUtils.sanitizeUrl(cachedUrl) || '')}" style="width: 100%; height: 100%; object-fit: cover; display: block;">` : ''}
                    </div>
                `;
            }).filter(html => html).join('');

            return `
                <div style="
                    margin-bottom: ${groupIndex < groupedByTrade.size - 1 ? '12px' : '0'}; 
                    width: 100%; 
                    display: block;
                    background: var(--auto-trades-bg-secondary, #2a2d30);
                    border: 1px solid var(--auto-trades-border, #4a4c4e);
                    border-radius: 8px;
                    padding: 12px;
                    box-sizing: border-box;
                ">
                    <div style="font-size: 11px; color: var(--auto-trades-text-secondary, #bdbebe); margin-bottom: 8px; font-weight: 600; text-align: center;">
                        ${SecurityUtils.sanitizeHtml(group.tradeName)}
                    </div>
                    <div style="display: flex; flex-wrap: nowrap; gap: 4px; justify-content: center; align-items: center; min-height: 36px; overflow-x: auto;">
                        ${itemsHtml || '<span style="color: #bdbebe; font-size: 12px;">No items</span>'}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = groupsHtml;
        container.style.display = 'block';
        container.style.width = '100%';

        if (window.Thumbnails && window.Thumbnails.fetchBatch && uniqueItemIds.length > 0) {
            window.Thumbnails.fetchBatch(uniqueItemIds).then(() => {
                if (window.Thumbnails && window.Thumbnails.loadForElements) {
                    const itemIcons = container.querySelectorAll('.item-icon');
                    window.Thumbnails.loadForElements(Array.from(itemIcons));
                }
            }).catch(() => {});
        } else if (window.Thumbnails && window.Thumbnails.loadForElements) {
            const itemIcons = container.querySelectorAll('.item-icon');
            window.Thumbnails.loadForElements(Array.from(itemIcons));
        }
    }

    function createProgressDialog(onStop) {
        const overlay = document.createElement('div');
        overlay.className = 'send-all-trades-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Source Sans Pro', Arial, sans-serif;
            animation: fadeIn 0.2s ease-out;
            padding: 20px;
            box-sizing: border-box;
            pointer-events: none;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'send-all-trades-dialog';
        dialog.style.cssText = `
            background: var(--auto-trades-bg-primary, #393b3d);
            border: 1px solid var(--auto-trades-border, #4a4c4e);
            border-radius: 12px;
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
            max-width: 500px;
            width: 100%;
            min-width: 400px;
            padding: 28px;
            margin: 0;
            animation: slideUp 0.3s ease-out;
            color: var(--auto-trades-text-primary, #ffffff);
            position: relative;
        `;

        dialog.innerHTML = `
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">
                    Sending All Trades
                </h3>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 20px;">
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe); margin-bottom: 8px; font-weight: 600;">
                            YOU GIVE
                        </div>
                        <div id="you-give-items" style="background: #2a2d30; border: 1px solid #4a4c4e; border-radius: 8px; padding: 12px; min-height: 60px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 4px; max-height: 200px; overflow-y: auto;">
                            <span style="color: #bdbebe;">Loading...</span>
                        </div>
                    </div>
                    
                    <div style="font-size: 24px; color: var(--auto-trades-text-primary, #ffffff); margin-top: 20px;">
                        →
                    </div>
                    
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe); margin-bottom: 8px; font-weight: 600;">
                            YOU GET
                        </div>
                        <div id="you-get-items" style="background: #2a2d30; border: 1px solid #4a4c4e; border-radius: 8px; padding: 12px; min-height: 60px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 4px; max-height: 200px; overflow-y: auto;">
                            <span style="color: #bdbebe;">Loading...</span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <div style="background: #2a2d30; border-radius: 20px; height: 24px; overflow: hidden; position: relative;">
                        <div id="progress-bar" style="background: #28a745; height: 100%; width: 0%; transition: width 0.3s ease; border-radius: 20px;"></div>
                    </div>
                    <div style="text-align: center; margin-top: 12px; font-size: 14px; color: var(--auto-trades-text-secondary, #bdbebe);">
                        <span id="progress-text">0 / 0 trades sent</span>
                    </div>
                </div>
                
                <div style="margin-top: 16px; text-align: center; font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe);">
                    <span id="failed-count-text">Failed due to owner settings: 0</span>
                </div>
                
                <div style="margin-top: 24px; display: flex; justify-content: center;">
                    <button id="stop-sending-btn" style="background: #dc3545; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                        Stop
                    </button>
                </div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const stopBtn = overlay.querySelector('#stop-sending-btn');
        const dialogElement = overlay.querySelector('.send-all-trades-dialog');
        if (dialogElement) {
            dialogElement.style.pointerEvents = 'auto';
        }
        if (stopBtn && onStop) {
            stopBtn.style.pointerEvents = 'auto';
            stopBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                stopBtn.textContent = 'Stopping...';
                stopBtn.disabled = true;
                onStop();
            });
        }

        progressDialog = overlay;
        return overlay;
    }

    function updateProgressDialog(successful, total, allOpportunities, failedCount = 0, isAllTrades = false) {
        if (!progressDialog) return;

        const progressBar = progressDialog.querySelector('#progress-bar');
        const progressText = progressDialog.querySelector('#progress-text');
        const failedCountText = progressDialog.querySelector('#failed-count-text');
        const youGiveItems = progressDialog.querySelector('#you-give-items');
        const youGetItems = progressDialog.querySelector('#you-get-items');

        if (progressBar) {
            const percentage = total > 0 ? (successful / total) * 100 : 0;
            progressBar.style.width = `${percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `${successful} / ${total} trades sent`;
        }

        if (failedCountText) {
            failedCountText.textContent = `Failed due to owner settings: ${failedCount}`;
        }

        if (allOpportunities && allOpportunities.length > 0) {
            if (isAllTrades) {
                youGiveItems.style.background = 'transparent';
                youGiveItems.style.border = 'none';
                youGiveItems.style.padding = '0';
                youGetItems.style.background = 'transparent';
                youGetItems.style.border = 'none';
                youGetItems.style.padding = '0';
            }
            try {
                renderItemsByTradeSetting(allOpportunities, youGiveItems, 'giving', isAllTrades);
            } catch (err) {
                console.error('Error rendering giving items:', err);
            }
            try {
                renderItemsByTradeSetting(allOpportunities, youGetItems, 'receiving', isAllTrades);
            } catch (err) {
                console.error('Error rendering receiving items:', err);
            }

            if (isAllTrades) {
                let isScrolling = false;
                
                const syncScroll = (source, target) => {
                    if (isScrolling) return;
                    isScrolling = true;
                    target.scrollTop = source.scrollTop;
                    target.scrollLeft = source.scrollLeft;
                    setTimeout(() => {
                        isScrolling = false;
                    }, 10);
                };

                youGiveItems.addEventListener('scroll', () => {
                    syncScroll(youGiveItems, youGetItems);
                });

                youGetItems.addEventListener('scroll', () => {
                    syncScroll(youGetItems, youGiveItems);
                });
            }
        }
    }

    function closeProgressDialog() {
        if (progressDialog) {
            progressDialog.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                if (progressDialog && progressDialog.parentNode) {
                    progressDialog.remove();
                }
                progressDialog = null;
            }, 200);
        }
    }

    function getProgressDialog() {
        return progressDialog;
    }

    window.SendAllProgressDialog = {
        create: createProgressDialog,
        update: updateProgressDialog,
        close: closeProgressDialog,
        get: getProgressDialog
    };

})();
