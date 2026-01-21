(function() {
    'use strict';

    const TradeNotifications = window.ModuleRegistry?.getSafe('TradeNotifications') || window.TradeStatusNotifications || { showTradeNotification: window.showTradeNotification };

    const notificationQueue = [];
    let isProcessing = false;
    const NOTIFICATION_DELAY = 1500;

    async function processNotificationQueue() {
        if (isProcessing || notificationQueue.length === 0) {
            return;
        }

        isProcessing = true;

        while (notificationQueue.length > 0) {
            const { trade, status } = notificationQueue.shift();
            
            if (TradeNotifications && TradeNotifications.showTradeNotification) {
                TradeNotifications.showTradeNotification(trade, status);
            } else if (window.showTradeNotification) {
                window.showTradeNotification(trade, status);
            }

            if (notificationQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, NOTIFICATION_DELAY));
            }
        }

        isProcessing = false;
    }

    function queueNotification(trade, status) {
        const tradeId = String(trade.id || '').trim();
        const notificationKey = `${tradeId}-${status}`;
        
        const alreadyQueued = notificationQueue.some(item => 
            String(item.trade.id || '').trim() === tradeId && item.status === status
        );
        
        if (!alreadyQueued) {
            notificationQueue.push({ trade, status });
            processNotificationQueue();
        }
    }

    window.TradeNotificationQueue = {
        queueNotification,
        processNotificationQueue
    };

})();
