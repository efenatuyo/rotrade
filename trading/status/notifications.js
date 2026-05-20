(function () {
    'use strict';
    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;
    async function areNotificationsEnabled() {
        try {
            if (!chrome || !chrome.storage || !chrome.storage.local) {
                return true;
            }
            const r = await chrome.storage.local.get(['rotradeSettings']);
            const s = (r && r.rotradeSettings) || {};
            return s.notificationsEnabled !== false;
        } catch {
            return true;
        }
    }
    async function areDesktopNotificationsEnabled() {
        try {
            if (!chrome || !chrome.storage || !chrome.storage.local) {
                return false;
            }
            const r = await chrome.storage.local.get(['rotradeSettings']);
            const s = (r && r.rotradeSettings) || {};
            return s.desktopNotificationsEnabled === true;
        } catch {
            return false;
        }
    }
    function fireDesktopNotification(title, message) {
        try {
            if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
                return;
            }
            chrome.runtime.sendMessage({
                action: 'showDesktopNotification',
                title: title,
                message: message,
            });
        } catch {}
    }
    function playNotificationSound() {
        try {
            if (!chrome || !chrome.runtime || !chrome.runtime.getURL) {
                return;
            }
            const audio = new Audio(chrome.runtime.getURL('assets/notification.mp3'));
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (error) {}
    }
    const NOTIFICATION_CONFIGS = {
        completed: {
            message: (user, tradeName) =>
                `Trade status with User ${user} (Template: ${tradeName}): Accepted`,
            type: 'success',
        },
        accepted: {
            message: (user, tradeName) =>
                `Trade status with User ${user} (Template: ${tradeName}): Accepted`,
            type: 'success',
        },
        countered: {
            message: (user, tradeName) =>
                `Trade status with User ${user} (Template: ${tradeName}): Countered`,
            type: 'info',
        },
        declined: {
            message: (user, tradeName) =>
                `Trade status with User ${user} (Template: ${tradeName}): Declined`,
            type: 'error',
        },
        expired: {
            message: (user, tradeName) =>
                `Trade status with User ${user} (Template: ${tradeName}): Declined`,
            type: 'error',
        },
    };
    function getNotificationConfig(trade, status) {
        const userName = trade.user || `User ${trade.targetUserId}`;
        const tradeName = trade.tradeName || trade.name || 'Unknown Trade';
        const config = NOTIFICATION_CONFIGS[status] || {
            message: (user, name) =>
                `Trade status with User ${user} (Template: ${name}): ${status}`,
            type: 'info',
        };
        return {
            message: config.message(userName, tradeName),
            type: config.type,
        };
    }
    function normalizeTradeIdForNotification(tradeId) {
        if (tradeId === null || tradeId === undefined) return null;
        return String(tradeId).trim();
    }
    function hasBeenNotified(tradeId, status) {
        const normalizedId = normalizeTradeIdForNotification(tradeId);
        if (!normalizedId) return false;
        const notifiedTrades = Storage.getAccount('notifiedTrades', []);
        const notificationKey = `${normalizedId}-${status}`;
        return notifiedTrades.includes(notificationKey);
    }
    function markAsNotified(tradeId, status) {
        const normalizedId = normalizeTradeIdForNotification(tradeId);
        if (!normalizedId) return;
        const notifiedTrades = Storage.getAccount('notifiedTrades', []);
        const notificationKey = `${normalizedId}-${status}`;
        if (!notifiedTrades.includes(notificationKey)) {
            notifiedTrades.push(notificationKey);
            Storage.setAccount('notifiedTrades', notifiedTrades);
        }
    }
    function createNotificationElement(message, type, customHTML = null) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.id = `trade-notification-${Date.now()}`;
        if (customHTML) {
            notification.innerHTML = customHTML;
        } else {
            notification.textContent = message;
        }
        const baseStyles = {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: customHTML ? '0' : '14px 24px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: '999999',
            animation: 'slideDownNotification 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            fontSize: '14px',
            fontWeight: '600',
            maxWidth: '450px',
            wordWrap: 'break-word',
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto',
        };
        const typeStyles = {
            success: {
                background: 'rgba(40, 167, 69, 0.95)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            },
            error: {
                background: 'rgba(220, 53, 69, 0.95)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            },
            info: {
                background: 'rgba(0, 123, 255, 0.95)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            },
        };
        Object.assign(notification.style, baseStyles, typeStyles[type] || typeStyles.info);
        return notification;
    }
    function createDeclinedTradeCard(trade) {
        const receiving = Array.isArray(trade.receiving) ? trade.receiving : [];
        const robuxGet = Number(trade.robuxGet) || 0;
        const userName = trade.user || `User ${trade.targetUserId}`;
        const renderItemIcon = (item) => {
            const itemId = String(item.id || item.itemId || '').trim();
            const itemName = item.name || 'Unknown Item';
            return `<div class="item-icon" data-item-id="${itemId}" data-id="${itemId}" data-item-name="${itemName}" style="width: 32px; height: 32px; font-size: 9px;" title="${itemName}">${itemName.substring(0, 2).toUpperCase()}</div>`;
        };
        const renderRobuxIcon = (amount) => {
            if (amount <= 0) return '';
            const display =
                amount >= 1e3 ? (amount / 1e3).toFixed(1) + 'K' : amount.toLocaleString();
            return `<div class="item-icon robux-icon" style="background: #00d26a; color: white; font-size: 9px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold;">R${display}</div>`;
        };
        return `\n            <div style="padding: 16px; max-width: 420px;">\n                <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; text-align: center;">\n                    Trade Declined with ${userName}\n                </div>\n                <div style="background: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 12px;">\n                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; opacity: 0.9;">YOU GET</div>\n                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">\n                        ${receiving.map(renderItemIcon).join('')}\n                        ${renderRobuxIcon(robuxGet)}\n                    </div>\n                </div>\n            </div>\n        `;
    }
    function dismissNotification(notification) {
        if (!notification || !notification.parentNode) {
            return;
        }
        notification.style.animation = 'slideUpNotification 0.3s ease';
        notification.style.cursor = 'default';
        notification.style.pointerEvents = 'none';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
    async function showTradeNotification(trade, status) {
        const tradeId = normalizeTradeIdForNotification(trade.id);
        if (!tradeId) {
            return;
        }
        if (!(await areNotificationsEnabled())) {
            return;
        }
        if (hasBeenNotified(tradeId, status)) {
            return;
        }
        const accountId = Storage.getCurrentAccountId();
        const notificationKey = `${tradeId}-${status}`;
        if (accountId && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'claimTradeNotification',
                    accountId: String(accountId),
                    notificationKey: notificationKey,
                });
                if (!response || !response.claimed) {
                    Storage.clearCache(`notifiedTrades_${accountId}`);
                    await Storage.getAccountAsync('notifiedTrades', []);
                    return;
                }
            } catch (error) {
                if (hasBeenNotified(tradeId, status)) {
                    return;
                }
            }
        }
        if (hasBeenNotified(tradeId, status)) {
            return;
        }
        markAsNotified(tradeId, status);
        const { message: message, type: type } = getNotificationConfig(trade, status);
        playNotificationSound();
        if (await areDesktopNotificationsEnabled()) {
            fireDesktopNotification('RoTrade — Trade status', message);
        }
        const notification = createNotificationElement(message, type);
        notification.style.cursor = 'pointer';
        notification.title = 'Click to dismiss';
        let autoDismissTimeout = setTimeout(() => {
            dismissNotification(notification);
        }, 6e3);
        notification.addEventListener('click', () => {
            if (autoDismissTimeout) {
                clearTimeout(autoDismissTimeout);
                autoDismissTimeout = null;
            }
            dismissNotification(notification);
        });
        if (document.body) {
            document.body.appendChild(notification);
        } else {
            const observer = new MutationObserver((mutations, obs) => {
                if (document.body) {
                    document.body.appendChild(notification);
                    obs.disconnect();
                }
            });
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
            });
        }
    }
    window.TradeStatusNotifications = {
        playNotificationSound: playNotificationSound,
        getNotificationConfig: getNotificationConfig,
        hasBeenNotified: hasBeenNotified,
        markAsNotified: markAsNotified,
        createNotificationElement: createNotificationElement,
        createDeclinedTradeCard: createDeclinedTradeCard,
        showTradeNotification: showTradeNotification,
    };
    window.showTradeNotification = showTradeNotification;
})();
