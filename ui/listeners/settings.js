(function() {
    'use strict';

    async function update2FAStatus(isInvalid = false, isSuccess = false) {
        const statusText = document.getElementById('twofa-secret-status-text');
        const statusMessage = document.getElementById('twofa-secret-status-message');
        const reset2FABtn = document.getElementById('reset-twofa-secret');
        const set2FABtn = document.getElementById('set-twofa-secret');
        
        if (!statusText) return;
        
        try {
            const userId = API.getCurrentUserIdSync ? API.getCurrentUserIdSync() : (await API.getCurrentUserId());
            if (!userId) {
                statusText.textContent = 'Not logged in';
                if (statusMessage) statusMessage.textContent = '';
                if (reset2FABtn) reset2FABtn.style.display = 'none';
                if (set2FABtn) set2FABtn.style.display = 'none';
                return;
            }
            
            if (isInvalid) {
                statusText.textContent = 'Secret invalid or expired ✗';
                statusText.style.color = '#dc3545';
                if (statusMessage) {
                    statusMessage.textContent = 'This key is invalid';
                    statusMessage.style.color = '#dc3545';
                }
                if (reset2FABtn) reset2FABtn.style.display = 'inline-block';
                if (set2FABtn) set2FABtn.textContent = 'Set Secret';
                await Storage.set(`2fa_secret_invalid_${userId}`, true);
                return;
            }
            
            if (isSuccess) {
                statusText.textContent = 'Secret configured ✓';
                statusText.style.color = '#28a745';
                if (statusMessage) {
                    statusMessage.textContent = 'Correct key';
                    statusMessage.style.color = '#28a745';
                }
                if (reset2FABtn) reset2FABtn.style.display = 'inline-block';
                if (set2FABtn) set2FABtn.textContent = 'Update Secret';
                await Storage.remove(`2fa_secret_invalid_${userId}`);
                return;
            }
            
            const storageKey = `2fa_secret_${userId}`;
            const encryptedSecret = await Storage.get(storageKey, null);
            const hasSecret = encryptedSecret !== null && encryptedSecret !== undefined;
            
            if (hasSecret) {
                const isInvalidStored = await Storage.get(`2fa_secret_invalid_${userId}`, false);
                if (isInvalidStored) {
                    statusText.textContent = 'Secret invalid or expired ✗';
                    statusText.style.color = '#dc3545';
                    if (statusMessage) {
                        statusMessage.textContent = 'This key is invalid';
                        statusMessage.style.color = '#dc3545';
                    }
                } else {
                    statusText.textContent = 'Secret configured ✓';
                    statusText.style.color = '#28a745';
                    if (statusMessage) {
                        statusMessage.textContent = 'Correct key';
                        statusMessage.style.color = '#28a745';
                    }
                }
                if (reset2FABtn) reset2FABtn.style.display = 'inline-block';
                if (set2FABtn) set2FABtn.textContent = 'Update Secret';
            } else {
                statusText.textContent = '';
                if (statusMessage) statusMessage.textContent = '';
                if (reset2FABtn) reset2FABtn.style.display = 'none';
                if (set2FABtn) set2FABtn.textContent = 'Set Secret';
            }
        } catch (error) {
            statusText.textContent = 'Error checking status';
            statusText.style.color = '#dc3545';
            if (statusMessage) statusMessage.textContent = '';
        }
    }

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
            saveBtn.addEventListener('click', async () => {
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

        const set2FASecretBtn = document.getElementById('set-twofa-secret');
        const reset2FASecretBtn = document.getElementById('reset-twofa-secret');
        const autoConfirmerCheckbox = document.getElementById('autoConfirmerEnabled');

        if (set2FASecretBtn) {
            set2FASecretBtn.addEventListener('click', async () => {
                try {
                    const userId = API.getCurrentUserIdSync ? API.getCurrentUserIdSync() : (await API.getCurrentUserId());
                    if (!userId) {
                        Dialogs.alert('Error', 'Please log in to Roblox first', 'error');
                        return;
                    }

                    const password = await Dialogs2FA.showPasswordPrompt(
                        'Set Password for 2FA Secret',
                        'Enter a password to encrypt your 2FA secret. You will need this password each time you use auto-confirmer.',
                        false
                    );
                    if (!password) {
                        return;
                    }

                    const secret = await Dialogs2FA.show2FASecretDialog();
                    if (!secret) {
                        return;
                    }

                    const base32Regex = /^[A-Z2-7]+=*$/;
                    if (!base32Regex.test(secret)) {
                        Dialogs.alert('Invalid Secret Format', 'The secret key must contain only uppercase letters A-Z and numbers 2-7 (Base32 format). Please check and try again.', 'error');
                        return;
                    }

                    if (secret.length < 16) {
                        Dialogs.alert('Invalid Secret Length', 'The secret key appears to be too short. Please check that you copied the entire code.', 'error');
                        return;
                    }

                    set2FASecretBtn.textContent = 'Validating...';
                    set2FASecretBtn.disabled = true;
                    
                    const statusText = document.getElementById('twofa-secret-status-text');
                    if (statusText) {
                        statusText.textContent = 'Validating secret...';
                        statusText.style.color = '#ffc107';
                    }

                    try {
                        const testCode = await Authenticator.generateTOTP(secret);
                        if (!testCode || testCode.length !== 6 || !/^\d{6}$/.test(testCode)) {
                            if (statusText) {
                                statusText.textContent = 'Invalid secret - validation failed';
                                statusText.style.color = '#dc3545';
                            }
                            Dialogs.alert('Invalid Secret', 'The secret key format is invalid and cannot generate TOTP codes. Please check and try again.', 'error');
                            set2FASecretBtn.textContent = 'Set Secret';
                            set2FASecretBtn.disabled = false;
                            return;
                        }

                        if (statusText) {
                            statusText.textContent = 'Saving secret...';
                            statusText.style.color = '#ffc107';
                        }
                        
                        set2FASecretBtn.textContent = 'Saving...';
                        await Authenticator.storeSecret(secret, userId, password);
                        await update2FAStatus(false, true);
                        Dialogs.alert('Success', '2FA secret has been validated and saved securely. Auto-confirmer can now be enabled.', 'info');
                    } catch (error) {
                        if (statusText) {
                            statusText.textContent = 'Error saving secret';
                            statusText.style.color = '#dc3545';
                        }
                        if (error.message && error.message.includes('Invalid secret format')) {
                            Dialogs.alert('Invalid Secret Format', 'The secret key format is invalid. Please ensure you copied the entire code correctly from Roblox.', 'error');
                        } else {
                            Dialogs.alert('Error', `Failed to save secret: ${error.message}`, 'error');
                        }
                    } finally {
                        set2FASecretBtn.textContent = 'Set Secret';
                        set2FASecretBtn.disabled = false;
                    }
                } catch (error) {
                    Dialogs.alert('Error', `An error occurred: ${error.message}`, 'error');
                }
            });
        }

        if (reset2FASecretBtn) {
            reset2FASecretBtn.addEventListener('click', async () => {
                const confirmed = await Dialogs.confirm('Reset 2FA Secret', 'Are you sure you want to reset your 2FA secret? You will need to set it again to use auto-confirmer.', 'Reset', 'Cancel');
                if (confirmed) {
                    try {
                        const userId = API.getCurrentUserIdSync ? API.getCurrentUserIdSync() : (await API.getCurrentUserId());
                        if (userId) {
                            await Trades.clearAutoConfirmerSecret(userId);
                            const statusText = document.getElementById('twofa-secret-status-text');
                            const resetBtn = document.getElementById('reset-twofa-secret');
                            const setBtn = document.getElementById('set-twofa-secret');
                            if (statusText) {
                                statusText.textContent = '';
                                statusText.style.color = 'var(--auto-trades-text-secondary, #bdbebe)';
                            }
                            if (resetBtn) resetBtn.style.display = 'none';
                            if (setBtn) setBtn.textContent = 'Set Secret';
                            Dialogs.alert('Success', '2FA secret has been reset.', 'info');
                        }
                    } catch (error) {
                        Dialogs.alert('Error', `Failed to reset secret: ${error.message}`, 'error');
                    }
                }
            });
        }

    }

    window.EventListenersSettings = {
        setupSettingsEventListeners,
        update2FAStatus
    };

    window.setupSettingsEventListeners = setupSettingsEventListeners;
    window.update2FAStatus = update2FAStatus;

})();