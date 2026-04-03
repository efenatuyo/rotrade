(function () {
    'use strict';
    const TradeNotifications = window.ModuleRegistry?.getSafe('TradeNotifications') ||
        window.TradeStatusNotifications || {
            showTradeNotification: window.showTradeNotification,
        };
    const notificationQueue = [];
    let isProcessing = false;
    const NOTIFICATION_DELAY = 1500;
    async function processNotificationQueue() {
        if (isProcessing || notificationQueue.length === 0) {
            return;
        }
        isProcessing = true;
        while (notificationQueue.length > 0) {
            const { trade: trade, status: status } = notificationQueue.shift();
            try {
                let result;
                if (TradeNotifications && TradeNotifications.showTradeNotification) {
                    result = TradeNotifications.showTradeNotification(trade, status);
                } else if (window.showTradeNotification) {
                    result = window.showTradeNotification(trade, status);
                } else if (
                    window.TradeStatusNotifications &&
                    window.TradeStatusNotifications.showTradeNotification
                ) {
                    result = window.TradeStatusNotifications.showTradeNotification(trade, status);
                }
                if (result && typeof result.then === 'function') {
                    await result;
                }
            } catch {}
            if (notificationQueue.length > 0) {
                await new Promise((resolve) => setTimeout(resolve, NOTIFICATION_DELAY));
            }
        }
        isProcessing = false;
    }
    function queueNotification(trade, status) {
        const tradeId = String(trade.id || '').trim();
        const alreadyQueued = notificationQueue.some(
            (item) => String(item.trade.id || '').trim() === tradeId && item.status === status
        );
        if (!alreadyQueued) {
            notificationQueue.push({
                trade: trade,
                status: status,
            });
            processNotificationQueue();
        }
    }
    window.TradeNotificationQueue = {
        queueNotification: queueNotification,
        processNotificationQueue: processNotificationQueue,
    };
})();
