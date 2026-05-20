(function () {
    const DEFAULTS = {
        maxOwnerDays: 1e8,
        lastOnlineDays: 3,
        tradeMemoryDays: 7,
        autoConfirmerEnabled: false,
        usdPer1kRobux: 4,
        usdValuesEnabled: true,
        tradeListValueBoxEnabled: true,
        notificationsEnabled: true,
        profileMetric: 'value',
        showTradeSummaryWinLoss: true,
        userProfileBadgesEnabled: true,
        desktopNotificationsEnabled: false,
    };
    const SAVE_DEBOUNCE_MS = 250;
    const STATUS_RESET_MS = 1500;
    const NUMERIC_VALIDATORS = {
        maxOwnerDays: {
            parse: (v) => parseInt(v, 10),
            min: 8,
            max: 999999999,
            message: 'Must be between 8 and 999,999,999.',
        },
        lastOnlineDays: {
            parse: (v) => parseInt(v, 10),
            min: 1,
            max: 365,
            message: 'Must be between 1 and 365.',
        },
        tradeMemoryDays: {
            parse: (v) => parseInt(v, 10),
            min: 1,
            max: 30,
            message: 'Must be between 1 and 30.',
        },
        usdPer1kRobux: {
            parse: (v) => parseFloat(v),
            min: 0.01,
            max: 1e3,
            message: 'Must be between 0.01 and 1000 (USD per 1,000 Robux).',
        },
    };
    const BOOLEAN_FIELDS = [
        'usdValuesEnabled',
        'tradeListValueBoxEnabled',
        'notificationsEnabled',
        'showTradeSummaryWinLoss',
        'userProfileBadgesEnabled',
    ];
    const PERMISSION_BOOLEAN_FIELDS = {
        desktopNotificationsEnabled: { permissions: ['notifications'] },
    };
    const SELECT_FIELDS = {
        profileMetric: { values: ['value', 'rap'], default: 'value' },
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
    async function patchSettings(patch) {
        const current = await getSettings();
        const merged = {
            ...current,
            ...patch,
        };
        await saveSettingsObj(merged);
        return merged;
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
    function populateFromSettings(s) {
        clearAllFieldErrors();
        document.getElementById('maxOwnerDays').value = s.maxOwnerDays;
        document.getElementById('lastOnlineDays').value = s.lastOnlineDays;
        document.getElementById('tradeMemoryDays').value = s.tradeMemoryDays;
        const usd1kInp = document.getElementById('usdPer1kRobux');
        if (usd1kInp) {
            usd1kInp.value = s.usdPer1kRobux;
        }
        const usdEn = document.getElementById('usdValuesEnabled');
        if (usdEn) {
            usdEn.checked = s.usdValuesEnabled !== false;
        }
        const tlvb = document.getElementById('tradeListValueBoxEnabled');
        if (tlvb) {
            tlvb.checked = s.tradeListValueBoxEnabled !== false;
        }
        const notif = document.getElementById('notificationsEnabled');
        if (notif) {
            notif.checked = s.notificationsEnabled !== false;
        }
        const showWinLoss = document.getElementById('showTradeSummaryWinLoss');
        if (showWinLoss) {
            showWinLoss.checked = s.showTradeSummaryWinLoss !== false;
        }
        const userBadges = document.getElementById('userProfileBadgesEnabled');
        if (userBadges) {
            userBadges.checked = s.userProfileBadgesEnabled !== false;
        }
        const desktopNotif = document.getElementById('desktopNotificationsEnabled');
        if (desktopNotif) {
            desktopNotif.checked = s.desktopNotificationsEnabled === true;
        }
        Object.keys(SELECT_FIELDS).forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            const cfg = SELECT_FIELDS[id];
            const raw = s[id];
            el.value = cfg.values.indexOf(raw) === -1 ? cfg.default : raw;
        });
        applyUsdEnabledStyling(s.usdValuesEnabled !== false);
        updateHelpTexts(s);
    }
    async function populate() {
        const s = await getSettings();
        populateFromSettings(s);
        await updateLoggedInHeader();
        await update2FAStatus(false, false);
    }
    function clearAllFieldErrors() {
        Object.keys(NUMERIC_VALIDATORS).forEach((id) => setFieldError(id, ''));
    }
    function setFieldError(id, message) {
        const el = document.getElementById(id + '-error');
        if (!el) {
            return;
        }
        el.textContent = message || '';
        el.hidden = !message;
    }
    let statusResetTimer = null;
    function setStatus(kind, text) {
        const el = document.getElementById('settings-status');
        if (!el) {
            return;
        }
        el.classList.remove(
            'settings-status--idle',
            'settings-status--ok',
            'settings-status--err'
        );
        el.classList.add(`settings-status--${kind}`);
        el.textContent = text || '';
        if (statusResetTimer) {
            clearTimeout(statusResetTimer);
            statusResetTimer = null;
        }
        if (kind === 'ok') {
            statusResetTimer = setTimeout(() => {
                el.classList.remove('settings-status--ok');
                el.classList.add('settings-status--idle');
                el.textContent = '';
                statusResetTimer = null;
            }, STATUS_RESET_MS);
        }
    }
    function applyUsdEnabledStyling(enabled) {
        const inp = document.getElementById('usdPer1kRobux');
        if (!inp) {
            return;
        }
        inp.disabled = !enabled;
        inp.style.opacity = enabled ? '' : '0.5';
    }
    const debouncedSaveById = {};
    function persistField(id) {
        if (id in NUMERIC_VALIDATORS) {
            const cfg = NUMERIC_VALIDATORS[id];
            const inp = document.getElementById(id);
            if (!inp) {
                return;
            }
            const raw = inp.value;
            const parsed = cfg.parse(raw);
            if (!isFinite(parsed) || parsed < cfg.min || parsed > cfg.max) {
                setFieldError(id, cfg.message);
                setStatus('err', 'Invalid value — not saved');
                return;
            }
            setFieldError(id, '');
            patchSettings({ [id]: parsed })
                .then((merged) => {
                    updateHelpTexts(merged);
                    setStatus('ok', 'Saved');
                })
                .catch(() => setStatus('err', 'Save failed'));
            return;
        }
        if (BOOLEAN_FIELDS.includes(id)) {
            const inp = document.getElementById(id);
            if (!inp) {
                return;
            }
            const value = !!inp.checked;
            patchSettings({ [id]: value })
                .then(() => {
                    if (id === 'usdValuesEnabled') {
                        applyUsdEnabledStyling(value);
                    }
                    setStatus('ok', 'Saved');
                })
                .catch(() => setStatus('err', 'Save failed'));
            return;
        }
        if (id in SELECT_FIELDS) {
            const inp = document.getElementById(id);
            if (!inp) {
                return;
            }
            const cfg = SELECT_FIELDS[id];
            const value = cfg.values.indexOf(inp.value) === -1 ? cfg.default : inp.value;
            patchSettings({ [id]: value })
                .then(() => setStatus('ok', 'Saved'))
                .catch(() => setStatus('err', 'Save failed'));
        }
    }
    function schedulePersist(id, delay) {
        if (debouncedSaveById[id]) {
            clearTimeout(debouncedSaveById[id]);
        }
        debouncedSaveById[id] = setTimeout(() => {
            debouncedSaveById[id] = null;
            persistField(id);
        }, delay);
    }
    function wireTabs() {
        const tabs = Array.from(document.querySelectorAll('.popup-tab'));
        const panels = Array.from(document.querySelectorAll('.tab-panel'));
        if (!tabs.length) {
            return;
        }
        const scroll = document.querySelector('.popup-scroll');
        const activate = function (name) {
            tabs.forEach(function (t) {
                const on = t.dataset.tab === name;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            panels.forEach(function (p) {
                const on = p.dataset.panel === name;
                p.classList.toggle('is-active', on);
                p.hidden = !on;
            });
            if (scroll) {
                scroll.scrollTop = 0;
            }
        };
        tabs.forEach(function (t) {
            t.addEventListener('click', function () {
                activate(t.dataset.tab);
            });
        });
    }
    function wire() {
        wireTabs();
        const resetBtn = document.getElementById('reset-settings');
        const clearHistoryBtn = document.getElementById('clear-trade-history');
        const set2FA = document.getElementById('set-twofa-secret');
        const reset2FA = document.getElementById('reset-twofa-secret');
        const openAuto = document.getElementById('open-auto-trades');
        Object.keys(NUMERIC_VALIDATORS).forEach(function (id) {
            const inp = document.getElementById(id);
            if (!inp) {
                return;
            }
            inp.addEventListener('input', function () {
                setFieldError(id, '');
                schedulePersist(id, SAVE_DEBOUNCE_MS);
            });
            inp.addEventListener('blur', function () {
                schedulePersist(id, 0);
            });
        });
        BOOLEAN_FIELDS.forEach(function (id) {
            const inp = document.getElementById(id);
            if (!inp) {
                return;
            }
            inp.addEventListener('change', function () {
                schedulePersist(id, 0);
            });
        });
        Object.keys(PERMISSION_BOOLEAN_FIELDS).forEach(function (id) {
            const inp = document.getElementById(id);
            if (!inp) {
                return;
            }
            inp.addEventListener('change', function () {
                const desired = !!inp.checked;
                const perms = PERMISSION_BOOLEAN_FIELDS[id];
                const finalize = function (granted) {
                    if (desired && !granted) {
                        inp.checked = false;
                        setStatus('err', 'Permission denied');
                        patchSettings({ [id]: false }).catch(function () {});
                        return;
                    }
                    patchSettings({ [id]: desired })
                        .then(function () {
                            setStatus('ok', 'Saved');
                        })
                        .catch(function () {
                            setStatus('err', 'Save failed');
                        });
                };
                if (!chrome.permissions || !chrome.permissions.request) {
                    finalize(true);
                    return;
                }
                if (desired) {
                    try {
                        chrome.permissions.request(perms, function (granted) {
                            finalize(!!granted);
                        });
                    } catch {
                        finalize(false);
                    }
                } else {
                    try {
                        chrome.permissions.remove(perms, function () {
                            finalize(true);
                        });
                    } catch {
                        finalize(true);
                    }
                }
            });
        });
        Object.keys(SELECT_FIELDS).forEach(function (id) {
            const inp = document.getElementById(id);
            if (!inp) {
                return;
            }
            inp.addEventListener('change', function () {
                schedulePersist(id, 0);
            });
        });
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (!confirm('Reset all values on this form to defaults?')) {
                    return;
                }
                await saveSettingsObj({ ...DEFAULTS });
                populateFromSettings({ ...DEFAULTS });
                setStatus('ok', 'Defaults applied');
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
