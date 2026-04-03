(function () {
    'use strict';
    const SecurityUtils = window.SecurityUtils || {
        sanitizeHtml: (s) => String(s || ''),
        sanitizeAttribute: (s) => String(s || ''),
        sanitizeUrl: (u) => u,
    };
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
        const itemIds = items
            .map((item) => String(item.id || item.itemId || ''))
            .filter((id) => id && id !== 'undefined' && id !== 'null' && id !== '0');
        const uniqueItemIds = [...new Set(itemIds)];
        const thumbnailHtml = items
            .map((item) => {
                const itemId = String(item.id || item.itemId || '');
                if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId === '0') {
                    return '';
                }
                const cachedUrl = window.thumbnailCache?.[itemId] || null;
                const itemName = item.name || 'Unknown Item';
                const initials = itemName.substring(0, 2).toUpperCase();
                const safeInitials = SecurityUtils.sanitizeHtml(initials);
                return `\n                <div class="item-icon" data-item-id="${itemId}" data-id="${itemId}" style="\n                    width: 36px;\n                    height: 36px;\n                    border-radius: 6px;\n                    border: 2px solid #4a4c4e;\n                    overflow: hidden;\n                    background: #2a2d30;\n                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n                    flex-shrink: 0;\n                    display: flex;\n                    align-items: center;\n                    justify-content: center;\n                    font-size: 11px;\n                    font-weight: bold;\n                    color: #ffffff;\n                ">\n                    ${cachedUrl && window.Thumbnails && window.Thumbnails.thumbnailImgHtml ? window.Thumbnails.thumbnailImgHtml(cachedUrl, itemId, safeInitials) : cachedUrl ? `<img src="${SecurityUtils.sanitizeAttribute(SecurityUtils.sanitizeUrl(cachedUrl) || '')}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="(function(img){if(img&&img.parentElement){img.style.display='none';img.parentElement.textContent='${safeInitials}';}})(this);">` : safeInitials}\n                </div>\n            `;
            })
            .filter((html) => html)
            .join('');
        container.innerHTML = thumbnailHtml;
        if (window.Thumbnails && window.Thumbnails.bindThumbnailErrorHandlers) {
            window.Thumbnails.bindThumbnailErrorHandlers(container);
        }
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '4px';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.minHeight = '40px';
        if (window.Thumbnails && window.Thumbnails.fetchBatch && uniqueItemIds.length > 0) {
            window.Thumbnails.fetchBatch(uniqueItemIds)
                .then(() => {
                    if (window.Thumbnails && window.Thumbnails.loadForElements) {
                        const itemIcons = container.querySelectorAll('.item-icon');
                        window.Thumbnails.loadForElements(Array.from(itemIcons));
                    }
                })
                .catch(() => {});
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
            const items =
                itemType === 'giving' ? opportunity.giving || [] : opportunity.receiving || [];
            renderAllItemsThumbnails(items, container);
            return;
        }
        const groupedByTrade = new Map();
        opportunities.forEach((opp) => {
            const tradeConfigId = String(opp.id || '');
            if (!tradeConfigId || tradeConfigId === 'undefined' || tradeConfigId === 'null') {
                return;
            }
            if (!groupedByTrade.has(tradeConfigId)) {
                const items = itemType === 'giving' ? opp.giving || [] : opp.receiving || [];
                groupedByTrade.set(tradeConfigId, {
                    tradeId: tradeConfigId,
                    tradeName: opp.name || 'Unknown Trade',
                    items: items,
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
        const allItemIds = Array.from(groupedByTrade.values()).flatMap((group) =>
            group.items
                .map((item) => String(item.id || item.itemId || ''))
                .filter((id) => id && id !== 'undefined' && id !== 'null' && id !== '0')
        );
        const uniqueItemIds = [...new Set(allItemIds)];
        const groupsHtml = Array.from(groupedByTrade.values())
            .map((group, groupIndex) => {
                const itemsHtml = group.items
                    .map((item) => {
                        const itemId = String(item.id || item.itemId || '');
                        if (
                            !itemId ||
                            itemId === 'undefined' ||
                            itemId === 'null' ||
                            itemId === '0'
                        ) {
                            return '';
                        }
                        const cachedUrl = window.thumbnailCache?.[itemId] || null;
                        const itemName = item.name || 'Unknown Item';
                        const initials = itemName.substring(0, 2).toUpperCase();
                        const safeInitials = SecurityUtils.sanitizeHtml(initials);
                        return `\n                    <div class="item-icon" data-item-id="${SecurityUtils.sanitizeAttribute(itemId)}" data-id="${SecurityUtils.sanitizeAttribute(itemId)}" style="\n                        width: 36px;\n                        height: 36px;\n                        border-radius: 6px;\n                        border: 2px solid #4a4c4e;\n                        overflow: hidden;\n                        background: #2a2d30;\n                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n                        flex-shrink: 0;\n                        display: flex;\n                        align-items: center;\n                        justify-content: center;\n                        font-size: 11px;\n                        font-weight: bold;\n                        color: #ffffff;\n                    ">\n                        ${cachedUrl && window.Thumbnails && window.Thumbnails.thumbnailImgHtml ? window.Thumbnails.thumbnailImgHtml(cachedUrl, itemId, safeInitials) : cachedUrl ? `<img src="${SecurityUtils.sanitizeAttribute(SecurityUtils.sanitizeUrl(cachedUrl) || '')}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="(function(img){if(img&&img.parentElement){img.style.display='none';img.parentElement.textContent='${safeInitials}';}})(this);">` : safeInitials}\n                    </div>\n                `;
                    })
                    .filter((html) => html)
                    .join('');
                return `\n                <div style="\n                    margin-bottom: ${groupIndex < groupedByTrade.size - 1 ? '12px' : '0'}; \n                    width: 100%; \n                    display: block;\n                    background: var(--auto-trades-bg-secondary, #2a2d30);\n                    border: 1px solid var(--auto-trades-border, #4a4c4e);\n                    border-radius: 8px;\n                    padding: 12px;\n                    box-sizing: border-box;\n                ">\n                    <div style="font-size: 11px; color: var(--auto-trades-text-secondary, #bdbebe); margin-bottom: 8px; font-weight: 600; text-align: center;">\n                        ${SecurityUtils.sanitizeHtml(group.tradeName)}\n                    </div>\n                    <div style="display: flex; flex-wrap: nowrap; gap: 4px; justify-content: center; align-items: center; min-height: 36px; overflow-x: auto;">\n                        ${itemsHtml || '<span style="color: #bdbebe; font-size: 12px;">No items</span>'}\n                    </div>\n                </div>\n            `;
            })
            .join('');
        container.innerHTML = groupsHtml;
        if (window.Thumbnails && window.Thumbnails.bindThumbnailErrorHandlers) {
            window.Thumbnails.bindThumbnailErrorHandlers(container);
        }
        container.style.display = 'block';
        container.style.width = '100%';
        if (window.Thumbnails && window.Thumbnails.fetchBatch && uniqueItemIds.length > 0) {
            window.Thumbnails.fetchBatch(uniqueItemIds)
                .then(() => {
                    if (window.Thumbnails && window.Thumbnails.loadForElements) {
                        const itemIcons = container.querySelectorAll('.item-icon');
                        window.Thumbnails.loadForElements(Array.from(itemIcons));
                    }
                })
                .catch(() => {});
        } else if (window.Thumbnails && window.Thumbnails.loadForElements) {
            const itemIcons = container.querySelectorAll('.item-icon');
            window.Thumbnails.loadForElements(Array.from(itemIcons));
        }
    }
    function createProgressDialog(onStop) {
        const overlay = document.createElement('div');
        overlay.className = 'send-all-trades-overlay';
        overlay.style.cssText = `\n            position: fixed;\n            top: 0;\n            left: 0;\n            width: 100vw;\n            height: 100vh;\n            background: rgba(0, 0, 0, 0.6);\n            z-index: 1000;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-family: 'Source Sans Pro', Arial, sans-serif;\n            animation: fadeIn 0.2s ease-out;\n            padding: 20px;\n            box-sizing: border-box;\n            pointer-events: none;\n        `;
        const dialog = document.createElement('div');
        dialog.className = 'send-all-trades-dialog';
        dialog.style.cssText = `\n            background: var(--auto-trades-bg-primary, #393b3d);\n            border: 1px solid var(--auto-trades-border, #4a4c4e);\n            border-radius: 12px;\n            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);\n            max-width: 500px;\n            width: 100%;\n            min-width: 400px;\n            padding: 28px;\n            margin: 0;\n            animation: slideUp 0.3s ease-out;\n            color: var(--auto-trades-text-primary, #ffffff);\n            position: relative;\n        `;
        dialog.innerHTML = `\n            <div style="margin-bottom: 24px;">\n                <h3 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">\n                    Sending All Trades\n                </h3>\n                \n                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 20px;">\n                    <div style="flex: 1;">\n                        <div style="font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe); margin-bottom: 8px; font-weight: 600;">\n                            YOU GIVE\n                        </div>\n                        <div id="you-give-items" style="background: #2a2d30; border: 1px solid #4a4c4e; border-radius: 8px; padding: 12px; min-height: 60px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 4px; max-height: 200px; overflow-y: auto;">\n                            <span style="color: #bdbebe;">Loading...</span>\n                        </div>\n                    </div>\n                    \n                    <div style="font-size: 24px; color: var(--auto-trades-text-primary, #ffffff); margin-top: 20px;">\n                        →\n                    </div>\n                    \n                    <div style="flex: 1;">\n                        <div style="font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe); margin-bottom: 8px; font-weight: 600;">\n                            YOU GET\n                        </div>\n                        <div id="you-get-items" style="background: #2a2d30; border: 1px solid #4a4c4e; border-radius: 8px; padding: 12px; min-height: 60px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 4px; max-height: 200px; overflow-y: auto;">\n                            <span style="color: #bdbebe;">Loading...</span>\n                        </div>\n                    </div>\n                </div>\n                \n                <div style="margin-top: 24px;">\n                    <div style="background: #2a2d30; border-radius: 20px; height: 24px; overflow: hidden; position: relative;">\n                        <div id="progress-bar" style="background: #28a745; height: 100%; width: 0%; transition: width 0.3s ease; border-radius: 20px;"></div>\n                    </div>\n                    <div style="text-align: center; margin-top: 12px; font-size: 14px; color: var(--auto-trades-text-secondary, #bdbebe);">\n                        <span id="progress-text">0 / 0 trades sent</span>\n                    </div>\n                </div>\n                \n                <div style="margin-top: 16px; text-align: center; font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe);">\n                    <span id="failed-count-text">Failed: 0</span>\n                </div>\n                \n                <div style="margin-top: 20px; font-family: 'Courier New', monospace; font-size: 14px; text-align: center;">\n                    <div id="status-log" style="line-height: 1.6; min-height: 24px;">\n                        <div class="status-line" style="color: #17a2b8;">[0/3] Initializing...</div>\n                    </div>\n                </div>\n                \n                <div style="margin-top: 24px; display: flex; justify-content: center;">\n                    <button id="stop-sending-btn" style="background: #dc3545; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">\n                        Stop\n                    </button>\n                </div>\n            </div>\n        `;
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
    let statusTimeout = null;
    function addStatusLog(step, totalSteps, message, type = 'info') {
        if (!progressDialog) return;
        const statusLog = progressDialog.querySelector('#status-log');
        if (!statusLog) return;
        const colors = {
            info: '#17a2b8',
            warning: '#ffc107',
            error: '#dc3545',
            success: '#28a745',
            pending: '#6f42c1',
        };
        let logEntry = statusLog.querySelector('.status-line');
        if (!logEntry) {
            logEntry = document.createElement('div');
            logEntry.className = 'status-line';
            logEntry.style.marginBottom = '0';
            logEntry.style.textAlign = 'center';
            statusLog.appendChild(logEntry);
        }
        if (statusTimeout) {
            clearTimeout(statusTimeout);
            statusTimeout = null;
        }
        logEntry.style.color = colors[type] || colors.info;
        logEntry.textContent = `[${step}/${totalSteps}] ${message}`;
        if (type === 'success' || type === 'error' || type === 'warning') {
            statusTimeout = setTimeout(() => {
                if (logEntry && statusLog.contains(logEntry)) {
                    logEntry.style.color = colors.info;
                    logEntry.textContent = `[${step}/${totalSteps}] Ready for next trade...`;
                }
            }, 2e3);
        }
    }
    function updateProgressDialog(
        successful,
        total,
        allOpportunities,
        failedCount = 0,
        isAllTrades = false,
        statusMessage = null
    ) {
        if (!progressDialog) return;
        const progressBar = progressDialog.querySelector('#progress-bar');
        const progressText = progressDialog.querySelector('#progress-text');
        const failedCountText = progressDialog.querySelector('#failed-count-text');
        const youGiveItems = progressDialog.querySelector('#you-give-items');
        const youGetItems = progressDialog.querySelector('#you-get-items');
        if (progressBar && window.ProgressOverlay) {
            window.ProgressOverlay.setBarFraction(progressBar, successful, total);
        }
        if (progressText) {
            progressText.textContent = `${successful} / ${total} trades sent`;
        }
        if (failedCountText) {
            failedCountText.textContent = `Failed: ${failedCount}`;
        }
        if (statusMessage) {
            addStatusLog(statusMessage.message, statusMessage.type || 'info');
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
            } catch {}
            try {
                renderItemsByTradeSetting(allOpportunities, youGetItems, 'receiving', isAllTrades);
            } catch {}
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
        if (!progressDialog || !window.ProgressOverlay) {
            return;
        }
        const el = progressDialog;
        window.ProgressOverlay.closeWithFade(el, function () {
            progressDialog = null;
        });
    }
    function getProgressDialog() {
        return progressDialog;
    }
    window.SendAllProgressDialog = {
        create: createProgressDialog,
        update: updateProgressDialog,
        addStatusLog: addStatusLog,
        close: closeProgressDialog,
        get: getProgressDialog,
    };
})();
