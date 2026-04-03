(function () {
    const DEFAULTS = {
        maxOwnerDays: 1e8,
        lastOnlineDays: 3,
        tradeMemoryDays: 7,
        autoConfirmerEnabled: false,
        tradeDetailChartAlertsEnabled: true,
        tradeDetailChartRecencyDays: 30,
        tradeDetailNewChartMinValue: 2e5,
        tradeDetailJumpMaxGapDays: 3,
        tradeDetailJumpMinPct: 1e3,
        usdPer1kRobux: 4,
    };
    async function getSettings() {
        const r = await chrome.storage.local.get(['rotradeSettings']);
        return {
            ...DEFAULTS,
            ...(r.rotradeSettings || {}),
        };
    }
    async function saveSettingsObj(settings) {
        await chrome.storage.local.set({
            rotradeSettings: settings,
        });
    }
    async function getRobloxUserFromTab() {
        try {
            const tabs = await chrome.tabs.query({
                url: '*://www.roblox.com/*',
            });
            if (!tabs.length) {
                return null;
            }
            const results = await chrome.scripting.executeScript({
                target: {
                    tabId: tabs[0].id,
                },
                func: () => {
                    const m = document.querySelector('meta[name="user-data"]');
                    if (!m) {
                        return null;
                    }
                    const id = m.getAttribute('data-userid');
                    if (!id || id === '0') {
                        return null;
                    }
                    const username =
                        m.getAttribute('data-name') ||
                        m.getAttribute('data-username') ||
                        m.getAttribute('data-displayname') ||
                        '';
                    return {
                        userId: id,
                        username: username.trim() || null,
                    };
                },
            });
            const raw = results[0] && results[0].result;
            return raw || null;
        } catch {
            return null;
        }
    }
    async function getRobloxUserId() {
        const session = await getRobloxUserFromTab();
        return session && session.userId ? parseInt(session.userId, 10) : null;
    }
    async function updateLoggedInHeader() {
        const el = document.getElementById('popup-logged-in');
        if (!el) {
            return;
        }
        const session = await getRobloxUserFromTab();
        if (session && session.username) {
            el.innerHTML = '';
            el.appendChild(document.createTextNode('Logged in as '));
            const strong = document.createElement('strong');
            strong.textContent = session.username;
            el.appendChild(strong);
        } else if (session && session.userId) {
            el.textContent = `Signed in (user ID ${session.userId})`;
        } else {
            el.textContent = 'No logged-in Roblox tab detected.';
        }
    }
    async function clearSentTradeHistoryKeys() {
        const all = await chrome.storage.local.get(null);
        const keys = Object.keys(all).filter(
            (k) => k === 'sentTradeHistory' || k.startsWith('sentTradeHistory_')
        );
        if (keys.length) {
            await chrome.storage.local.remove(keys);
        }
    }
    function updateHelpTexts(s) {
        const a = document.getElementById('maxOwnerDays-help');
        const b = document.getElementById('lastOnlineDays-help');
        const c = document.getElementById('tradeMemoryDays-help');
        if (a) {
            a.textContent = `Max days since user owned items (current: ${s.maxOwnerDays.toLocaleString()})`;
        }
        if (b) {
            b.textContent = `Max days since user was online (current: ${s.lastOnlineDays})`;
        }
        if (c) {
            c.textContent = `Block same trade combo for this many days (current: ${s.tradeMemoryDays})`;
        }
        const td1 = document.getElementById('tradeDetailChartRecencyDays-help');
        const td2 = document.getElementById('tradeDetailNewChartMinValue-help');
        const td3 = document.getElementById('tradeDetailJumpMaxGapDays-help');
        const td4 = document.getElementById('tradeDetailJumpMinPct-help');
        if (td1) {
            td1.textContent = `Only flag rows when data is within this many days of now (current: ${s.tradeDetailChartRecencyDays})`;
        }
        if (td2) {
            td2.textContent = `“New chart” alert if first scan is within recency and value is at least this (current: ${Number(s.tradeDetailNewChartMinValue).toLocaleString()})`;
        }
        if (td3) {
            td3.textContent = `Compare consecutive chart points at most this many days apart (current: ${s.tradeDetailJumpMaxGapDays})`;
        }
        if (td4) {
            td4.textContent = `Jump alert if relative increase is at least this percent (current: ${s.tradeDetailJumpMinPct}%)`;
        }
        const usd1k = document.getElementById('usdPer1kRobux-help');
        if (usd1k) {
            const v = Number(s.usdPer1kRobux);
            usd1k.textContent = `Used for Robux→USD in trades and catalog (current: $${isFinite(v) ? v.toFixed(2) : '4.00'} / 1k)`;
        }
    }
    async function update2FAStatus(isInvalid, isSuccess) {
        const statusText = document.getElementById('twofa-secret-status-text');
        const statusMessage = document.getElementById('twofa-secret-status-message');
        const resetBtn = document.getElementById('reset-twofa-secret');
        const setBtn = document.getElementById('set-twofa-secret');
        if (!statusText) {
            return;
        }
        const userId = await getRobloxUserId();
        if (!userId) {
            statusText.textContent = 'No Roblox tab open';
            if (statusMessage) {
                statusMessage.textContent = '';
            }
            if (resetBtn) {
                resetBtn.style.display = 'none';
            }
            if (setBtn) {
                setBtn.style.display = 'none';
            }
            return;
        }
        if (setBtn) {
            setBtn.style.display = '';
        }
        if (isInvalid) {
            statusText.textContent = 'Invalid or expired';
            statusText.style.color = '#dc3545';
            if (statusMessage) {
                statusMessage.textContent = 'Key invalid';
                statusMessage.style.color = '#dc3545';
            }
            if (resetBtn) {
                resetBtn.style.display = 'inline-block';
            }
            if (setBtn) {
                setBtn.textContent = 'Set secret';
            }
            await window.Storage.set(`2fa_secret_invalid_${userId}`, true);
            return;
        }
        if (isSuccess) {
            statusText.textContent = 'Configured';
            statusText.style.color = '#28a745';
            if (statusMessage) {
                statusMessage.textContent = 'Saved';
                statusMessage.style.color = '#28a745';
            }
            if (resetBtn) {
                resetBtn.style.display = 'inline-block';
            }
            if (setBtn) {
                setBtn.textContent = 'Update secret';
            }
            await window.Storage.remove(`2fa_secret_invalid_${userId}`);
            return;
        }
        const storageKey = `2fa_secret_${userId}`;
        const encrypted = await window.Storage.get(storageKey, null);
        const hasSecret = encrypted != null;
        if (hasSecret) {
            const inv = await window.Storage.get(`2fa_secret_invalid_${userId}`, false);
            if (inv) {
                statusText.textContent = 'Invalid or expired';
                statusText.style.color = '#dc3545';
                if (statusMessage) {
                    statusMessage.textContent = 'Key invalid';
                    statusMessage.style.color = '#dc3545';
                }
            } else {
                statusText.textContent = 'Configured';
                statusText.style.color = '#28a745';
                if (statusMessage) {
                    statusMessage.textContent = '';
                }
            }
            if (resetBtn) {
                resetBtn.style.display = 'inline-block';
            }
            if (setBtn) {
                setBtn.textContent = 'Update secret';
            }
        } else {
            statusText.textContent = 'Not set';
            statusText.style.color = '#bdbebe';
            if (statusMessage) {
                statusMessage.textContent = '';
            }
            if (resetBtn) {
                resetBtn.style.display = 'none';
            }
            if (setBtn) {
                setBtn.textContent = 'Set secret';
            }
        }
    }
    async function populate() {
        clearSaveFieldErrors();
        const s = await getSettings();
        document.getElementById('maxOwnerDays').value = s.maxOwnerDays;
        document.getElementById('lastOnlineDays').value = s.lastOnlineDays;
        document.getElementById('tradeMemoryDays').value = s.tradeMemoryDays;
        const chartEn = document.getElementById('tradeDetailChartAlertsEnabled');
        if (chartEn) {
            chartEn.checked = s.tradeDetailChartAlertsEnabled !== false;
        }
        const tdR = document.getElementById('tradeDetailChartRecencyDays');
        if (tdR) {
            tdR.value = s.tradeDetailChartRecencyDays;
        }
        const tdN = document.getElementById('tradeDetailNewChartMinValue');
        if (tdN) {
            tdN.value = s.tradeDetailNewChartMinValue;
        }
        const tdJ = document.getElementById('tradeDetailJumpMaxGapDays');
        if (tdJ) {
            tdJ.value = s.tradeDetailJumpMaxGapDays;
        }
        const tdP = document.getElementById('tradeDetailJumpMinPct');
        if (tdP) {
            tdP.value = s.tradeDetailJumpMinPct;
        }
        const usd1kInp = document.getElementById('usdPer1kRobux');
        if (usd1kInp) {
            usd1kInp.value = s.usdPer1kRobux;
        }
        updateHelpTexts(s);
        await updateLoggedInHeader();
        await update2FAStatus(false, false);
    }
    const SAVE_VALIDATED_FIELD_IDS = [
        'maxOwnerDays',
        'lastOnlineDays',
        'tradeMemoryDays',
        'tradeDetailChartRecencyDays',
        'tradeDetailNewChartMinValue',
        'tradeDetailJumpMaxGapDays',
        'tradeDetailJumpMinPct',
        'usdPer1kRobux',
    ];
    function clearSaveFieldErrors() {
        SAVE_VALIDATED_FIELD_IDS.forEach(function (id) {
            const el = document.getElementById(id + '-error');
            if (el) {
                el.textContent = '';
                el.hidden = true;
            }
        });
    }
    function setSaveFieldError(id, message) {
        const el = document.getElementById(id + '-error');
        if (!el) {
            return;
        }
        el.textContent = message || '';
        el.hidden = !message;
        if (message) {
            el.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
            const inp = document.getElementById(id);
            if (inp && typeof inp.focus === 'function') {
                inp.focus();
            }
        }
    }
    function wire() {
        const saveBtn = document.getElementById('save-settings');
        const resetBtn = document.getElementById('reset-settings');
        const clearHistoryBtn = document.getElementById('clear-trade-history');
        const set2FA = document.getElementById('set-twofa-secret');
        const reset2FA = document.getElementById('reset-twofa-secret');
        const openAuto = document.getElementById('open-auto-trades');
        const refreshHelp = async () => {
            const s = await getSettings();
            updateHelpTexts(s);
        };
        SAVE_VALIDATED_FIELD_IDS.forEach(function (id) {
            const inp = document.getElementById(id);
            if (inp) {
                inp.addEventListener('input', function () {
                    setSaveFieldError(id, '');
                });
            }
        });
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                clearSaveFieldErrors();
                const maxOwnerDays =
                    parseInt(document.getElementById('maxOwnerDays').value, 10) || 1e8;
                const lastOnlineDays =
                    parseInt(document.getElementById('lastOnlineDays').value, 10) || 3;
                const tradeMemoryDays =
                    parseInt(document.getElementById('tradeMemoryDays').value, 10) || 7;
                const tradeDetailChartAlertsEnabled = document.getElementById(
                    'tradeDetailChartAlertsEnabled'
                )
                    ? document.getElementById('tradeDetailChartAlertsEnabled').checked
                    : DEFAULTS.tradeDetailChartAlertsEnabled;
                const tradeDetailChartRecencyDays =
                    parseInt(document.getElementById('tradeDetailChartRecencyDays').value, 10) ||
                    DEFAULTS.tradeDetailChartRecencyDays;
                const tradeDetailNewChartMinValue =
                    parseInt(document.getElementById('tradeDetailNewChartMinValue').value, 10) || 0;
                const tradeDetailJumpMaxGapDays = parseFloat(
                    document.getElementById('tradeDetailJumpMaxGapDays').value
                );
                const tradeDetailJumpMinPct =
                    parseInt(document.getElementById('tradeDetailJumpMinPct').value, 10) ||
                    DEFAULTS.tradeDetailJumpMinPct;
                const usdPer1kRobux = parseFloat(document.getElementById('usdPer1kRobux').value);
                if (maxOwnerDays < 8 || maxOwnerDays > 999999999) {
                    setSaveFieldError('maxOwnerDays', 'Must be between 8 and 999,999,999.');
                    return;
                }
                if (lastOnlineDays < 1 || lastOnlineDays > 365) {
                    setSaveFieldError('lastOnlineDays', 'Must be between 1 and 365.');
                    return;
                }
                if (tradeMemoryDays < 1 || tradeMemoryDays > 30) {
                    setSaveFieldError('tradeMemoryDays', 'Must be between 1 and 30.');
                    return;
                }
                if (tradeDetailChartRecencyDays < 1 || tradeDetailChartRecencyDays > 365) {
                    setSaveFieldError(
                        'tradeDetailChartRecencyDays',
                        'Must be between 1 and 365 days.'
                    );
                    return;
                }
                if (tradeDetailNewChartMinValue < 0 || tradeDetailNewChartMinValue > 999999999999) {
                    setSaveFieldError(
                        'tradeDetailNewChartMinValue',
                        'Must be between 0 and 999,999,999,999.'
                    );
                    return;
                }
                if (
                    !isFinite(tradeDetailJumpMaxGapDays) ||
                    tradeDetailJumpMaxGapDays < 0.25 ||
                    tradeDetailJumpMaxGapDays > 30
                ) {
                    setSaveFieldError(
                        'tradeDetailJumpMaxGapDays',
                        'Must be between 0.25 and 30 days.'
                    );
                    return;
                }
                if (tradeDetailJumpMinPct < 1 || tradeDetailJumpMinPct > 5e4) {
                    setSaveFieldError('tradeDetailJumpMinPct', 'Must be between 1% and 50000%.');
                    return;
                }
                if (!isFinite(usdPer1kRobux) || usdPer1kRobux < 0.01 || usdPer1kRobux > 1e3) {
                    setSaveFieldError(
                        'usdPer1kRobux',
                        'Must be between 0.01 and 1000 (USD per 1,000 Robux).'
                    );
                    return;
                }
                const cur = await getSettings();
                await saveSettingsObj({
                    ...cur,
                    maxOwnerDays: maxOwnerDays,
                    lastOnlineDays: lastOnlineDays,
                    tradeMemoryDays: tradeMemoryDays,
                    tradeDetailChartAlertsEnabled: tradeDetailChartAlertsEnabled,
                    tradeDetailChartRecencyDays: tradeDetailChartRecencyDays,
                    tradeDetailNewChartMinValue: tradeDetailNewChartMinValue,
                    tradeDetailJumpMaxGapDays: tradeDetailJumpMaxGapDays,
                    tradeDetailJumpMinPct: tradeDetailJumpMinPct,
                    usdPer1kRobux: usdPer1kRobux,
                });
                clearSaveFieldErrors();
                await refreshHelp();
                const t = saveBtn.textContent;
                saveBtn.textContent = 'Saved';
                setTimeout(() => {
                    saveBtn.textContent = t;
                }, 1500);
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (!confirm('Reset all values on this form to defaults?')) {
                    return;
                }
                clearSaveFieldErrors();
                document.getElementById('maxOwnerDays').value = DEFAULTS.maxOwnerDays;
                document.getElementById('lastOnlineDays').value = DEFAULTS.lastOnlineDays;
                document.getElementById('tradeMemoryDays').value = DEFAULTS.tradeMemoryDays;
                const cen = document.getElementById('tradeDetailChartAlertsEnabled');
                if (cen) {
                    cen.checked = DEFAULTS.tradeDetailChartAlertsEnabled;
                }
                const cr = document.getElementById('tradeDetailChartRecencyDays');
                if (cr) {
                    cr.value = DEFAULTS.tradeDetailChartRecencyDays;
                }
                const cn = document.getElementById('tradeDetailNewChartMinValue');
                if (cn) {
                    cn.value = DEFAULTS.tradeDetailNewChartMinValue;
                }
                const cj = document.getElementById('tradeDetailJumpMaxGapDays');
                if (cj) {
                    cj.value = DEFAULTS.tradeDetailJumpMaxGapDays;
                }
                const cp = document.getElementById('tradeDetailJumpMinPct');
                if (cp) {
                    cp.value = DEFAULTS.tradeDetailJumpMinPct;
                }
                const cUsd = document.getElementById('usdPer1kRobux');
                if (cUsd) {
                    cUsd.value = DEFAULTS.usdPer1kRobux;
                }
                await refreshHelp();
            });
        }
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', async () => {
                if (
                    !confirm(
                        'Clear all sent trade history? You can send the same trades again immediately.'
                    )
                ) {
                    return;
                }
                await clearSentTradeHistoryKeys();
                const t = clearHistoryBtn.textContent;
                clearHistoryBtn.textContent = 'Cleared';
                setTimeout(() => {
                    clearHistoryBtn.textContent = t;
                }, 1500);
            });
        }
        if (set2FA) {
            set2FA.addEventListener('click', async () => {
                const userId = await getRobloxUserId();
                if (!userId) {
                    alert('Open a www.roblox.com tab and log in first.');
                    return;
                }
                const password = await window.Dialogs2FA.showPasswordPrompt(
                    'Encrypt 2FA secret',
                    'Choose a password to encrypt your secret. You will need it when sending trades.',
                    false
                );
                if (!password) {
                    return;
                }
                const secret = await window.Dialogs2FA.show2FASecretDialog();
                if (!secret) {
                    return;
                }
                const base32Regex = /^[A-Z2-7]+=*$/;
                if (!base32Regex.test(secret)) {
                    alert('Secret must be Base32 (A-Z and 2-7 only).');
                    return;
                }
                if (secret.length < 16) {
                    alert('Secret looks too short.');
                    return;
                }
                set2FA.textContent = '…';
                set2FA.disabled = true;
                try {
                    const testCode = await window.Authenticator.generateTOTP(secret);
                    if (!testCode || testCode.length !== 6 || !/^\d{6}$/.test(testCode)) {
                        alert('Invalid secret — TOTP check failed.');
                        return;
                    }
                    await window.Authenticator.storeSecret(secret, userId, password);
                    await window.Storage.remove(`2fa_secret_expired_streak_${userId}`);
                    if (window.Storage.flush) {
                        await window.Storage.flush();
                    }
                    await update2FAStatus(false, true);
                    alert('2FA secret saved.');
                } catch (e) {
                    alert(e.message || 'Failed to save secret');
                } finally {
                    set2FA.textContent = 'Set secret';
                    set2FA.disabled = false;
                    await update2FAStatus(false, false);
                }
            });
        }
        if (reset2FA) {
            reset2FA.addEventListener('click', async () => {
                if (!confirm('Remove saved 2FA secret?')) {
                    return;
                }
                const userId = await getRobloxUserId();
                if (!userId) {
                    return;
                }
                await window.Authenticator.clearSecret(userId);
                await window.Storage.remove(`2fa_secret_expired_streak_${userId}`);
                await window.Storage.remove(`2fa_secret_invalid_${userId}`);
                if (window.Storage.flush) {
                    await window.Storage.flush();
                }
                await update2FAStatus(false, false);
                alert('2FA secret removed.');
            });
        }
        if (openAuto) {
            openAuto.addEventListener('click', () => {
                chrome.tabs.query(
                    {
                        url: '*://www.roblox.com/*',
                    },
                    (tabs) => {
                        if (tabs.length) {
                            chrome.tabs.update(tabs[0].id, {
                                active: true,
                                url: 'https://www.roblox.com/auto-trades',
                            });
                        } else {
                            chrome.tabs.create({
                                url: 'https://www.roblox.com/auto-trades',
                                active: true,
                            });
                        }
                        window.close();
                    }
                );
            });
        }
    }
    document.addEventListener('DOMContentLoaded', () => {
        populate();
        wire();
    });
})();
