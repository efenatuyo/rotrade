(function() {
    'use strict';

    function setupAutoTradesEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.setProperty('border-bottom', 'none', 'important');
                });

                e.target.classList.add('active');
                e.target.style.setProperty('border-bottom', '3px solid white', 'important');

                const filter = e.target.dataset.filter;

                // Hide all sections first
                document.getElementById('auto-trades-section').style.display = 'none';
                document.getElementById('outbound-section').style.display = 'none';
                document.getElementById('expired-section').style.display = 'none';
                document.getElementById('countered-section').style.display = 'none';
                document.getElementById('completed-section').style.display = 'none';
                
                // Hide empty state when switching to other sections
                const emptyState = document.getElementById('empty-state');
                if (emptyState) {
                    emptyState.style.display = 'none';
                }

                if (filter === 'auto-trades') {
                    document.getElementById('auto-trades-section').style.display = 'block';
                    // Reload auto trades data - this will handle showing empty state if needed
                    if (window.loadAutoTradeData) {
                        window.loadAutoTradeData();
                    }
                } else if (filter === 'outbound') {
                    document.getElementById('outbound-section').style.display = 'block';
                    const container = document.getElementById('outbound-container');
                    if (container) container.innerHTML = '';
                    Storage.set('outbound-containerCurrentPage', '1');
                    (async () => {
                        if (window.validateAutoTradesInventory) {
                            await window.validateAutoTradesInventory();
                        }
                        setTimeout(() => {
                            if (window.loadOutboundTrades) {
                                window.loadOutboundTrades();
                            } else if (typeof TradeLoading !== 'undefined' && TradeLoading.loadOutboundTrades) {
                                TradeLoading.loadOutboundTrades();
                            }
                        }, 100);
                    })();
                } else if (filter === 'expired') {
                    document.getElementById('expired-section').style.display = 'block';
                    const container = document.getElementById('expired-container');
                    if (container) container.innerHTML = '';
                    Storage.set('expired-containerCurrentPage', '1');
                    if (window.loadExpiredTrades) window.loadExpiredTrades();
                } else if (filter === 'countered') {
                    document.getElementById('countered-section').style.display = 'block';
                    const container = document.getElementById('countered-container');
                    if (container) container.innerHTML = '';
                    Storage.set('countered-containerCurrentPage', '1');
                    if (window.loadCounteredTrades) window.loadCounteredTrades();
                } else if (filter === 'completed') {
                    document.getElementById('completed-section').style.display = 'block';
                    const container = document.getElementById('completed-container');
                    if (container) container.innerHTML = '';
                    Storage.set('completed-containerCurrentPage', '1');
                    if (window.loadCompletedTrades) window.loadCompletedTrades();
                }
            });
        });

        const sendTradesBtn = document.getElementById('send-trades');
        if (sendTradesBtn) {
            sendTradesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.setItem('loadSendTrades', 'true');
                window.location.href = '/trades';
            });
        }

        const startBtn = document.getElementById('start-auto-trades');
        const stopBtn = document.getElementById('stop-auto-trades');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                startBtn.style.display = 'none';
                if (stopBtn) stopBtn.style.display = 'inline-flex';
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                stopBtn.style.display = 'none';
                if (startBtn) startBtn.style.display = 'inline-flex';
            });
        }
    }

    window.EventListenersAutoTrades = {
        setupAutoTradesEventListeners
    };

    window.setupAutoTradesEventListeners = setupAutoTradesEventListeners;

})();