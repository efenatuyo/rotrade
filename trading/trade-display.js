(function() {
    'use strict';

    window.TradeDisplay = {
        get displayAutoTrades() { return window.displayAutoTrades; },
        get displayTrades() { return window.displayTrades; },
        get displayTradeOpportunities() { return window.displayTradeOpportunities; },
        get handleAutoTradeActions() { return window.TradeDisplayActions?.handleAutoTradeActions; }
    };

})();