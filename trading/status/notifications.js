(function() {
    'use strict';

    function playNotificationSound() {
        try {
            if (!chrome || !chrome.runtime || !chrome.runtime.getURL) {
                return;
            }
            const audio = new Audio(chrome.runtime.getURL('assets/notification.mp3'));
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (error) {
        }
    }

    const NOTIFICATION_CONFIGS = {
        'completed': { message: (user, tradeName) => `Trade status with User ${user} (Template: ${tradeName}): Accepted`, type: 'success' },
        'accepted': { message: (user, tradeName) => `Trade status with User ${user} (Template: ${tradeName}): Accepted`, type: 'success' },
        'countered': { message: (user, tradeName) => `Trade status with User ${user} (Template: ${tradeName}): Countered`, type: 'info' },
        'declined': { message: (user, tradeName) => `Trade status with User ${user} (Template: ${tradeName}): Declined`, type: 'error' },
        'expired': { message: (user, tradeName) => `Trade status with User ${user} (Template: ${tradeName}): Declined`, type: 'error' }
    };

    function getNotificationConfig(trade, status) {
        const userName = trade.user || `User ${trade.targetUserId}`;
        const tradeName = trade.tradeName || trade.name || 'Unknown Trade';
        const config = NOTIFICATION_CONFIGS[status] || { message: (user, name) => `Trade status with User ${user} (Template: ${name}): ${status}`, type: 'info' };
        return { message: config.message(userName, tradeName), type: config.type };
    }

    function hasBeenNotified(tradeId, status) {
        const notifiedTrades = Storage.get('notifiedTrades', []);
        return notifiedTrades.includes(`${tradeId}-${status}`);
    }

    function markAsNotified(tradeId, status) {
        const notifiedTrades = Storage.get('notifiedTrades', []);
        notifiedTrades.push(`${tradeId}-${status}`);
        Storage.set('notifiedTrades', notifiedTrades);
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
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            padding: customHTML ? '0' : '14px 24px', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: '999999',
            animation: 'slideDownNotification 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            fontSize: '14px', fontWeight: '600', maxWidth: '450px',
            wordWrap: 'break-word', backdropFilter: 'blur(10px)',
            pointerEvents: 'auto'
        };

        const typeStyles = {
            'success': { background: 'rgba(40, 167, 69, 0.95)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)' },
            'error': { background: 'rgba(220, 53, 69, 0.95)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)' },
            'info': { background: 'rgba(0, 123, 255, 0.95)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)' }
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
            const display = amount >= 1000 ? (amount / 1000).toFixed(1) + 'K' : amount.toLocaleString();
            return `<div class="item-icon robux-icon" style="background: #00d26a; color: white; font-size: 9px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold;">R${display}</div>`;
        };

        return `
            <div style="padding: 16px; max-width: 420px;">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; text-align: center;">
                    Trade Declined with ${userName}
                </div>
                <div style="background: rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 12px;">
                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; opacity: 0.9;">YOU GET</div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${receiving.map(renderItemIcon).join('')}
                        ${renderRobuxIcon(robuxGet)}
                    </div>
                </div>
            </div>
        `;
    }

    function showTradeNotification(trade, status) {
        if (hasBeenNotified(trade.id, status)) return;

        markAsNotified(trade.id, status);

        const { message, type } = getNotificationConfig(trade, status);

        playNotificationSound();
        
        const notification = createNotificationElement(message, type);
        
        if (document.body) {
            document.body.appendChild(notification);
        } else {
            const observer = new MutationObserver((mutations, obs) => {
                if (document.body) {
                    document.body.appendChild(notification);
                    obs.disconnect();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideUpNotification 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4000);
    }

    window.TradeStatusNotifications = {
        playNotificationSound,
        getNotificationConfig,
        hasBeenNotified,
        markAsNotified,
        createNotificationElement,
        createDeclinedTradeCard,
        showTradeNotification
    };

    window.showTradeNotification = showTradeNotification;

})();