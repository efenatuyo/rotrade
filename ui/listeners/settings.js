(function() {
    'use strict';

    function setupSettingsEventListeners() {
        const saveBtn = document.getElementById('save-settings');
        const resetBtn = document.getElementById('reset-settings');
        const clearHistoryBtn = document.getElementById('clear-trade-history');

        const updateCurrentValuesInUI = () => {
            const currentSettings = Trades.getSettings();
            const maxOwnerSmall = document.querySelector('#maxOwnerDays + small');
            const lastOnlineSmall = document.querySelector('#lastOnlineDays + small');
            const tradeMemorySmall = document.querySelector('#tradeMemoryDays + small');

            if (maxOwnerSmall) {
                maxOwnerSmall.textContent = `Maximum days since user owned the items (current: ${currentSettings.maxOwnerDays.toLocaleString()})`;
            }
            if (lastOnlineSmall) {
                lastOnlineSmall.textContent = `Maximum days since user was last online (current: ${currentSettings.lastOnlineDays})`;
            }
            if (tradeMemorySmall) {
                tradeMemorySmall.textContent = `Prevents sending the same item combo to a user for this many days. Current: ${currentSettings.tradeMemoryDays}`;
            }
        };

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const maxOwnerDays = parseInt(document.getElementById('maxOwnerDays').value) || 100000000;
                const lastOnlineDays = parseInt(document.getElementById('lastOnlineDays').value) || 3;
                const tradeMemoryDays = parseInt(document.getElementById('tradeMemoryDays').value) || 7;

                if (maxOwnerDays < 8 || maxOwnerDays > 999999999) {
                    Dialogs.alert('Invalid Value', 'Max Owner Days must be between 8 and 999,999,999', 'error');
                    return;
                }

                if (lastOnlineDays < 1 || lastOnlineDays > 365) {
                    Dialogs.alert('Invalid Value', 'Last Online Days must be between 1 and 365', 'error');
                    return;
                }

                if (tradeMemoryDays < 1 || tradeMemoryDays > 30) {
                    Dialogs.alert('Invalid Value', 'Trade Memory Days must be between 1 and 30', 'error');
                    return;
                }

                const settings = { maxOwnerDays, lastOnlineDays, tradeMemoryDays };
                Trades.saveSettings(settings);
                updateCurrentValuesInUI();
                saveBtn.textContent = 'Settings Saved!';
                Utils.delay(2000).then(() => {
                    saveBtn.textContent = 'Save Settings';
                });
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                const confirmed = await Dialogs.confirm('Reset Settings', 'Are you sure you want to reset settings to default values?', 'Reset', 'Cancel');
                if (confirmed) {
                    document.getElementById('maxOwnerDays').value = 100000000;
                    document.getElementById('lastOnlineDays').value = 3;
                    document.getElementById('tradeMemoryDays').value = 7;
                    updateCurrentValuesInUI();
                }
            });
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', async () => {
                const confirmed = await Dialogs.confirm('Clear Trade History', 'Are you sure you want to clear all sent trade history? This will allow you to send trades to users again immediately.', 'Clear History', 'Cancel');
                if (confirmed) {
                    Storage.remove('sentTradeHistory');
                    clearHistoryBtn.textContent = 'History Cleared';
                    Utils.delay(2000).then(() => {
                        clearHistoryBtn.textContent = 'Clear Sent Trade History';
                    });
                }
            });
        }
    }

    window.EventListenersSettings = {
        setupSettingsEventListeners
    };

    window.setupSettingsEventListeners = setupSettingsEventListeners;

})();