(function() {
    'use strict';

    function loadSettingsPage() {
        const settings = Trades.getSettings();
        const langPrefix = window.PagesUtils ? window.PagesUtils.getLanguagePrefix() : '';
        const buildPath = window.PagesUtils ? window.PagesUtils.buildPath : (path) => (langPrefix || '') + path;

        const content = `
            <div class="auto-trades-container">
                <a href="${buildPath('/auto-trades')}" class="back-link">← Back to Auto Trades</a>

                <div class="auto-trades-header" style="text-align: center; display: flex; justify-content: center; align-items: center;">
                    <h1 class="auto-trades-title" style="text-align: center; width: 100%; margin: 0;">Settings</h1>
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

                    <div class="settings-section">
                        <h3>Auto 2FA Confirmer</h3>
                        <p class="section-description">Automatically confirm 2FA challenges when sending trades using your authenticator secret. If you have a secret configured, you will be prompted for your password when sending trades.</p>

                        <div id="twofa-secret-status" style="margin-top: 16px; padding: 12px; background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; border: 1px solid var(--auto-trades-border, #4a4c4e);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 4px; color: var(--auto-trades-text-primary, #ffffff);">2FA Secret Status</div>
                                    <div id="twofa-secret-status-text" style="font-size: 13px; color: var(--auto-trades-text-secondary, #bdbebe);"></div>
                                    <div id="twofa-secret-status-message" style="font-size: 12px; margin-top: 4px;"></div>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button id="set-twofa-secret" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px;">Set Secret</button>
                                    <button id="reset-twofa-secret" class="btn btn-danger" style="padding: 8px 16px; font-size: 13px; display: none;">Reset</button>
                                </div>
                            </div>
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
        
        Utils.delay(100).then(async () => {
            if (window.update2FAStatus) {
                await window.update2FAStatus();
            }
        });
    }

    window.PagesSettings = {
        loadSettingsPage
    };

    window.loadSettingsPage = loadSettingsPage;

})();