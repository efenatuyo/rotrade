(function() {
    'use strict';

    function loadSettingsPage() {
        const settings = Trades.getSettings();
        const langPrefix = window.PagesUtils ? window.PagesUtils.getLanguagePrefix() : '';
        const buildPath = window.PagesUtils ? window.PagesUtils.buildPath : (path) => (langPrefix || '') + path;

        const content = `
            <div class="auto-trades-container">
                <a href="${buildPath('/auto-trades')}" class="back-link">← Back to Auto Trades</a>

                <div class="auto-trades-header">
                    <h1 class="auto-trades-title">Settings</h1>
                </div>

                <div class="settings-sections">
                    <div class="settings-section">
                        <h3>Common Owners Fetching</h3>
                        <p class="section-description">Adjust parameters for finding users who own the items you want to trade for.</p>

                        <div class="setting-group">
                            <label class="setting-label">Max Owner Days</label>
                            <input type="number" id="maxOwnerDays" class="setting-input" value="${settings.maxOwnerDays}" min="8" max="999999999" />
                            <small class="setting-help">Maximum days since user owned the items (current: ${settings.maxOwnerDays.toLocaleString()})</small>
                        </div>

                        <div class="setting-group">
                            <label class="setting-label">Last Online Days</label>
                            <input type="number" id="lastOnlineDays" class="setting-input" value="${settings.lastOnlineDays}" min="1" max="365" />
                            <small class="setting-help">Maximum days since user was last online (current: ${settings.lastOnlineDays})</small>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Trade History</h3>
                        <p class="section-description">Manage how long the extension remembers sent trades.</p>

                        <div class="setting-group">
                            <label class="setting-label">Trade Memory Expiry (Days)</label>
                            <input type="number" id="tradeMemoryDays" class="setting-input" value="${settings.tradeMemoryDays}" min="1" max="30" />
                            <small class="setting-help">Prevents sending the same item combo to a user for this many days. Current: ${settings.tradeMemoryDays}</small>
                        </div>
                        
                        <div class="setting-actions">
                            <button class="btn btn-danger" id="clear-trade-history">Clear Sent Trade History</button>
                        </div>
                    </div>

                    <div class="setting-actions">
                        <button class="btn btn-secondary" id="save-settings">Save Settings</button>
                        <button class="btn btn-opposite" id="reset-settings">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;

        UI.replacePageContent(content);
        if (window.setupSettingsEventListeners) {
            window.setupSettingsEventListeners();
        }
    }

    window.PagesSettings = {
        loadSettingsPage
    };

    window.loadSettingsPage = loadSettingsPage;

})();