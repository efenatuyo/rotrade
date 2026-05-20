(function () {
    'use strict';
    function getTutorialImagePath(step) {
        if (chrome && chrome.runtime && chrome.runtime.getURL) {
            return chrome.runtime.getURL(`assets/tutorial-${step}.png`);
        }
        return `assets/tutorial-${step}.png`;
    }
    function show2FASecretDialog() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'extension-dialog-overlay';
            overlay.style.cssText = `\n                position: fixed;\n                top: 0;\n                left: 0;\n                width: 100vw;\n                height: 100vh;\n                background: rgba(0, 0, 0, 0.7);\n                z-index: 999999;\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                font-family: 'Source Sans Pro', Arial, sans-serif;\n                animation: fadeIn 0.2s ease-out;\n                padding: 20px;\n                box-sizing: border-box;\n            `;
            let showingTutorial = false;
            let cancelBtnRef = null;
            const dialog = document.createElement('div');
            dialog.className = 'extension-dialog-2fa';
            dialog.style.cssText = `\n                background: var(--auto-trades-bg-primary, #393b3d);\n                border: 1px solid var(--auto-trades-border, #4a4c4e);\n                border-radius: 12px;\n                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);\n                max-width: 600px;\n                width: 100%;\n                min-width: 400px;\n                max-height: 90vh;\n                overflow-y: auto;\n                color: var(--auto-trades-text-primary, #ffffff);\n                position: relative;\n            `;
            function showTutorial() {
                showingTutorial = true;
                dialog.innerHTML = `\n                    <div style="padding: 28px;">\n                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">\n                            <h3 style="margin: 0; font-size: 22px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">\n                                How to Get Your 2FA Secret\n                            </h3>\n                            <button id="tutorial-close" style="background: transparent; border: none; color: #bdbebe; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;">\n                                ×\n                            </button>\n                        </div>\n                        \n                        <div style="margin-bottom: 24px;">\n                            <div style="background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; padding: 20px; margin-bottom: 16px;">\n                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #00A2FF;">Step 1: Enable Authenticator App</h4>\n                                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">\n                                    Go to your Roblox Security Settings and select "Authenticator App (Very Secure)" as your 2-Step Verification method.\n                                </p>\n                                <img src="${getTutorialImagePath('step1')}" alt="Step 1" style="width: 100%; border-radius: 6px; border: 1px solid var(--auto-trades-border, #4a4c4e);" />\n                            </div>\n                            \n                            <div style="background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; padding: 20px; margin-bottom: 16px;">\n                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #00A2FF;">Step 2: Click "Can't scan the QR code?"</h4>\n                                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">\n                                    On the Authenticator Setup screen, click the red highlighted link that says "Can't scan the QR code? Click here for manual entry."\n                                </p>\n                                <img src="${getTutorialImagePath('step2')}" alt="Step 2" style="width: 100%; border-radius: 6px; border: 1px solid var(--auto-trades-border, #4a4c4e);" />\n                            </div>\n                            \n                            <div style="background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; padding: 20px; margin-bottom: 16px;">\n                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #00A2FF;">Step 3: Copy the Secret Key</h4>\n                                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">\n                                    You'll see a long text code (like "JUJRHLQRH2OUFIDRYTV7ZJQ2UA"). Copy this entire code and paste it in the field when you go back.\n                                </p>\n                                <img src="${getTutorialImagePath('step3')}" alt="Step 3" style="width: 100%; border-radius: 6px; border: 1px solid var(--auto-trades-border, #4a4c4e); margin-bottom: 12px;" />\n                                <div style="padding: 12px; background: rgba(0, 162, 255, 0.1); border-left: 3px solid #00A2FF; border-radius: 4px;">\n                                    <p style="margin: 0; font-size: 13px; color: #bdbebe; font-family: monospace;">\n                                        Example: JUJRHLQRH2OUFIDRYTV7ZJQ2UA\n                                    </p>\n                                </div>\n                            </div>\n                            \n                            <div style="background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; padding: 20px;">\n                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #00A2FF;">Step 4: Return to QR Code</h4>\n                                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">\n                                    After copying the code, you can go back to the QR code view and complete setup normally. The extension will use the secret code you provide.\n                                </p>\n                            </div>\n                        </div>\n                        \n                        <div style="display: flex; gap: 12px; justify-content: flex-end;">\n                            <button id="tutorial-back" style="background: transparent; color: var(--auto-trades-text-secondary, #bdbebe); border: 1px solid var(--auto-trades-border, #4a4c4e); padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;">\n                                Back\n                            </button>\n                        </div>\n                    </div>\n                `;
                const closeBtn = dialog.querySelector('#tutorial-close');
                const backBtn = dialog.querySelector('#tutorial-back');
                const closeTutorial = () => {
                    showingTutorial = false;
                    showMainDialog();
                };
                closeBtn.addEventListener('click', closeTutorial);
                backBtn.addEventListener('click', closeTutorial);
                closeBtn.addEventListener('mouseenter', () => {
                    closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                });
                closeBtn.addEventListener('mouseleave', () => {
                    closeBtn.style.background = 'transparent';
                });
            }
            function showMainDialog() {
                showingTutorial = false;
                dialog.innerHTML = `\n                    <div style="padding: 28px;">\n                        <h3 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">\n                            Enter 2FA Secret Key\n                        </h3>\n                        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">\n                            Enter your Roblox authenticator secret key. This will be encrypted and stored securely.\n                        </p>\n                        \n                        <div style="margin-bottom: 20px; padding: 12px; background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 8px; margin-bottom: 20px;">\n                            <div style="display: flex; align-items: flex-start; gap: 8px;">\n                                <span style="font-size: 18px; line-height: 1;">⚠️</span>\n                                <div style="flex: 1;">\n                                    <strong style="color: #dc3545; font-size: 13px; display: block; margin-bottom: 4px;">SECURITY WARNING</strong>\n                                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: var(--auto-trades-text-secondary, #bdbebe);">\n                                        Never share this secret key with anyone. Roblox will never ask you for this code. Keep it secure and private.\n                                    </p>\n                                </div>\n                            </div>\n                        </div>\n                        \n                        <div style="margin-bottom: 20px;">\n                            <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">\n                                2FA Secret Key\n                            </label>\n                            <div style="position: relative;">\n                                <input \n                                    type="password" \n                                    class="secret-input-field"\n                                    placeholder="JUJRHLQRH2OUFIDRYTV7ZJQ2UA"\n                                    autocomplete="off"\n                                    spellcheck="false"\n                                    style="width: 100%; padding: 12px 45px 12px 12px; background: var(--auto-trades-bg-secondary, #2a2d30); border: 1px solid var(--auto-trades-border, #4a4c4e); border-radius: 8px; color: var(--auto-trades-text-primary, #ffffff); font-size: 14px; font-family: monospace; box-sizing: border-box;"\n                                />\n                                <button id="secret-toggle" type="button" style="\n                                    position: absolute;\n                                    right: 12px;\n                                    top: 50%;\n                                    transform: translateY(-50%);\n                                    background: transparent;\n                                    border: none;\n                                    color: var(--auto-trades-text-secondary, #bdbebe);\n                                    cursor: pointer;\n                                    padding: 4px;\n                                    display: flex;\n                                    align-items: center;\n                                    justify-content: center;\n                                    font-size: 18px;\n                                    transition: color 0.2s;\n                                " title="Show/Hide secret">👁️</button>\n                            </div>\n                            <small style="display: block; margin-top: 8px; font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe);">\n                                Need help? Click the tutorial button below.\n                            </small>\n                        </div>\n                        \n                        <div style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">\n                            <button id="twofa-tutorial-btn" style="background: transparent; color: #00A2FF; border: 1px solid #00A2FF; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;">\n                                📖 Tutorial\n                            </button>\n                            <button id="twofa-cancel-btn" style="background: transparent; color: var(--auto-trades-text-secondary, #bdbebe); border: 1px solid var(--auto-trades-border, #4a4c4e); padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;">\n                                Cancel\n                            </button>\n                            <button id="twofa-save-btn" style="background: #00A2FF; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0, 162, 255, 0.3);">\n                                Save\n                            </button>\n                        </div>\n                    </div>\n                `;
                const input = dialog.querySelector('.secret-input-field');
                const toggleBtn = dialog.querySelector('#secret-toggle');
                const tutorialBtn = dialog.querySelector('#twofa-tutorial-btn');
                const cancelBtn = dialog.querySelector('#twofa-cancel-btn');
                const saveBtn = dialog.querySelector('#twofa-save-btn');
                cancelBtnRef = cancelBtn;
                let secretVisible = false;
                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    secretVisible = !secretVisible;
                    input.type = secretVisible ? 'text' : 'password';
                    toggleBtn.textContent = secretVisible ? '🙈' : '👁️';
                });
                tutorialBtn.addEventListener('click', showTutorial);
                cancelBtn.addEventListener('click', () => {
                    overlay.style.animation = 'fadeOut 0.2s ease-out';
                    dialog.style.animation = 'slideDown 0.2s ease-out';
                    setTimeout(() => {
                        overlay.remove();
                        resolve(null);
                    }, 200);
                });
                saveBtn.addEventListener('click', () => {
                    const secret = input.value.trim().toUpperCase().replace(/\s+/g, '');
                    if (!secret) {
                        input.style.borderColor = '#dc3545';
                        setTimeout(() => {
                            input.style.borderColor = 'var(--auto-trades-border, #4a4c4e)';
                        }, 2e3);
                        return;
                    }
                    overlay.style.animation = 'fadeOut 0.2s ease-out';
                    dialog.style.animation = 'slideDown 0.2s ease-out';
                    setTimeout(() => {
                        overlay.remove();
                        resolve(secret);
                    }, 200);
                });
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        saveBtn.click();
                    }
                });
                input.focus();
            }
            showMainDialog();
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && !showingTutorial && cancelBtnRef) {
                    cancelBtnRef.click();
                }
            });
        });
    }
    function showPasswordPrompt(title, message, isRetry = false, validatePassword = null) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'extension-dialog-overlay';
            overlay.style.cssText = `\n                position: fixed;\n                top: 0;\n                left: 0;\n                width: 100vw;\n                height: 100vh;\n                background: rgba(0, 0, 0, 0.7);\n                z-index: 999999;\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                font-family: 'Source Sans Pro', Arial, sans-serif;\n                animation: fadeIn 0.2s ease-out;\n                padding: 20px;\n                box-sizing: border-box;\n            `;
            const dialog = document.createElement('div');
            dialog.className = 'extension-dialog-password';
            dialog.style.cssText = `\n                background: var(--auto-trades-bg-primary, #393b3d);\n                border: 1px solid var(--auto-trades-border, #4a4c4e);\n                border-radius: 12px;\n                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);\n                max-width: 480px;\n                width: 100%;\n                min-width: 320px;\n                color: var(--auto-trades-text-primary, #ffffff);\n                position: relative;\n            `;
            const sHtml =
                window.SecurityUtils && window.SecurityUtils.sanitizeHtml
                    ? window.SecurityUtils.sanitizeHtml
                    : (v) => {
                          const d = document.createElement('div');
                          d.textContent = String(v ?? '');
                          return d.innerHTML;
                      };
            const safeTitle = sHtml(title);
            const safeMessage = sHtml(message);
            dialog.innerHTML = `\n                <div style="padding: 28px 28px 24px; border-bottom: 1px solid var(--auto-trades-border, #4a4c4e);">\n                    <div style="display: flex; align-items: flex-start; gap: 16px;">\n                        <div style="font-size: 36px; line-height: 1; flex-shrink: 0; margin-top: 2px;">🔒</div>\n                        <div style="flex: 1; min-width: 0;">\n                            <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff); line-height: 1.4;">\n                                ${safeTitle}\n                            </h3>\n                            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">\n                                ${safeMessage}\n                            </p>\n                        </div>\n                    </div>\n                </div>\n                <div style="padding: 24px 28px;">\n                    <div style="margin-bottom: 20px;">\n                        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">\n                            Password\n                        </label>\n                        <div style="position: relative;">\n                            <input type="password" id="password-input" class="password-input-field" placeholder="Enter your password" style="\n                                width: 100%;\n                                padding: 12px 45px 12px 16px;\n                                background: var(--auto-trades-bg-secondary, #2a2d30);\n                                border: 1px solid var(--auto-trades-border, #4a4c4e);\n                                border-radius: 8px;\n                                color: var(--auto-trades-text-primary, #ffffff);\n                                font-size: 15px;\n                                box-sizing: border-box;\n                                outline: none;\n                                transition: border-color 0.2s;\n                            " />\n                            <button id="password-toggle" type="button" style="\n                                position: absolute;\n                                right: 12px;\n                                top: 50%;\n                                transform: translateY(-50%);\n                                background: transparent;\n                                border: none;\n                                color: var(--auto-trades-text-secondary, #bdbebe);\n                                cursor: pointer;\n                                padding: 4px;\n                                display: flex;\n                                align-items: center;\n                                justify-content: center;\n                                font-size: 18px;\n                                transition: color 0.2s;\n                            " title="Show/Hide password">👁️</button>\n                        </div>\n                        <p id="password-error" style="margin: 8px 0 0 0; font-size: 13px; color: #dc3545; display: none;">Password not correct</p>\n                        ${isRetry ? '<p style="margin: 8px 0 0 0; font-size: 13px; color: #dc3545;">Incorrect password. Please try again.</p>' : ''}\n                        <p style="margin: 12px 0 0 0; font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe); line-height: 1.5; text-align: center;">\n                            Note: This is not your Roblox password. This is the password you set when configuring your 2FA secret.\n                        </p>\n                    </div>\n                </div>\n                <div style="padding: 20px 28px; display: flex; gap: 12px; justify-content: flex-end; background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 0 0 12px 12px;">\n                    <button id="password-cancel" class="extension-dialog-btn" style="\n                        background: transparent;\n                        color: var(--auto-trades-text-secondary, #bdbebe);\n                        border: 1px solid var(--auto-trades-border, #4a4c4e);\n                        padding: 12px 28px;\n                        border-radius: 8px;\n                        font-size: 15px;\n                        font-weight: 600;\n                        cursor: pointer;\n                        transition: all 0.2s ease;\n                    ">Cancel</button>\n                    <button id="password-submit" class="extension-dialog-btn extension-dialog-btn-primary" style="\n                        background: #00A2FF;\n                        color: white;\n                        border: none;\n                        padding: 12px 28px;\n                        border-radius: 8px;\n                        font-size: 15px;\n                        font-weight: 600;\n                        cursor: pointer;\n                        transition: all 0.2s ease;\n                        box-shadow: 0 2px 8px rgba(0, 162, 255, 0.3);\n                    ">Submit</button>\n                </div>\n            `;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            const passwordInput = dialog.querySelector('.password-input-field');
            const cancelBtn = dialog.querySelector('#password-cancel');
            const submitBtn = dialog.querySelector('#password-submit');
            const toggleBtn = dialog.querySelector('#password-toggle');
            const errorMsg = dialog.querySelector('#password-error');
            let passwordVisible = false;
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                passwordVisible = !passwordVisible;
                passwordInput.type = passwordVisible ? 'text' : 'password';
                toggleBtn.textContent = passwordVisible ? '🙈' : '👁️';
            });
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            const showError = (message) => {
                if (errorMsg) {
                    errorMsg.textContent = message || 'Password not correct';
                    errorMsg.style.display = 'block';
                    passwordInput.style.borderColor = '#dc3545';
                }
            };
            const hideError = () => {
                if (errorMsg) {
                    errorMsg.style.display = 'none';
                    passwordInput.style.borderColor = 'var(--auto-trades-border, #4a4c4e)';
                }
            };
            const handleSubmit = async () => {
                const password = passwordInput.value.trim();
                if (!password) {
                    passwordInput.style.borderColor = '#dc3545';
                    passwordInput.focus();
                    return;
                }
                if (validatePassword) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Validating...';
                    try {
                        const isValid = await validatePassword(password);
                        if (!isValid) {
                            showError('Password not correct');
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Submit';
                            passwordInput.focus();
                            passwordInput.select();
                            return;
                        }
                    } catch (error) {
                        showError('Password not correct');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit';
                        passwordInput.focus();
                        passwordInput.select();
                        return;
                    }
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit';
                }
                cleanup();
                resolve(password);
            };
            passwordInput.addEventListener('input', () => {
                hideError();
            });
            const handleCancel = () => {
                cleanup();
                resolve(null);
            };
            passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                }
            });
            submitBtn.addEventListener('click', handleSubmit);
            cancelBtn.addEventListener('click', handleCancel);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    handleCancel();
                }
            });
            passwordInput.focus();
        });
    }
    window.Dialogs2FA = {
        show2FASecretDialog: show2FASecretDialog,
        showPasswordPrompt: showPasswordPrompt,
    };
})();
