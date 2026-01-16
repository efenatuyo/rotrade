
document.addEventListener('DOMContentLoaded', function() {

    initializePopup();
    setupEventListeners();
});

function initializePopup() {

    const container = document.querySelector('.popup-container');
    if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';

        setTimeout(() => {
            container.style.transition = 'all 0.3s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 50);
    }
}

function setupEventListeners() {

    const dashboardBtn = document.getElementById('openDashboard');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', function() {

            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);

            chrome.tabs.query({url: '*://www.roblox.com/*'}, function(tabs) {
                if (tabs.length > 0) {

                    chrome.tabs.update(tabs[0].id, {
                        active: true,
                        url: 'https://www.roblox.com/auto-trades'
                    });
                } else {

                    chrome.tabs.create({
                        url: 'https://www.roblox.com/auto-trades',
                        active: true
                    });
                }

                window.close();
            });
        });
    }

    const websiteBtn = document.getElementById('visitWebsite');
    if (websiteBtn) {
        websiteBtn.addEventListener('click', function() {

            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);

            chrome.tabs.create({
                url: 'https://roautotrade.com',
                active: true
            });

            window.close();
        });
    }

    const creditItems = document.querySelectorAll('.credit-item');
    creditItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });

        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

window.addEventListener('error', function(e) {
    console.error('🚨 Popup error:', e.error);
});
