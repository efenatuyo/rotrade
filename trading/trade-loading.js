(function() {
    'use strict';

    window.TradeLoading = {
        get loadAutoTradeData() { return window.loadAutoTradeData; },
        get loadOutboundTrades() { return window.loadOutboundTrades; },
        get loadExpiredTrades() { return window.loadExpiredTrades; },
        get loadCounteredTrades() { return window.loadCounteredTrades; },
        get loadCompletedTrades() { return window.loadCompletedTrades; }
    };

})();