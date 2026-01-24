(function() {
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
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.7);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Source Sans Pro', Arial, sans-serif;
                animation: fadeIn 0.2s ease-out;
                padding: 20px;
                box-sizing: border-box;
            `;

            let showingTutorial = false;
            let cancelBtnRef = null;

            const dialog = document.createElement('div');
            dialog.className = 'extension-dialog-2fa';
            dialog.style.cssText = `
                background: var(--auto-trades-bg-primary, #393b3d);
                border: 1px solid var(--auto-trades-border, #4a4c4e);
                border-radius: 12px;
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
                max-width: 600px;
                width: 100%;
                min-width: 400px;
                max-height: 90vh;
                overflow-y: auto;
                color: var(--auto-trades-text-primary, #ffffff);
                position: relative;
            `;

            function showTutorial() {
                showingTutorial = true;
                dialog.innerHTML = `
                    <div style="padding: 28px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h3 style="margin: 0; font-size: 22px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">
                                How to Get Your 2FA Secret
                            </h3>
                            <button id="tutorial-close" style="background: transparent; border: none; color: #bdbebe; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;">
                                ×
                            </button>
                        </div>
                        
                        <div style="margin-bottom: 24px;">
                            <div style="background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #00A2FF;">Step 1: Enable Authenticator App</h4>
                                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">
                                    Go to your Roblox Security Settings and select "Authenticator App (Very Secure)" as your 2-Step Verification method.
                                </p>
                                <img src="${getTutorialImagePath('step1')}" alt="Step 1" style="width: 100%; border-radius: 6px; border: 1px solid var(--auto-trades-border, #4a4c4e);" />
                            </div>
                            
                            <div style="background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #00A2FF;">Step 2: Click "Can't scan the QR code?"</h4>
                                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">
                                    On the Authenticator Setup screen, click the red highlighted link that says "Can't scan the QR code? Click here for manual entry."
                                </p>
                                <img src="${getTutorialImagePath('step2')}" alt="Step 2" style="width: 100%; border-radius: 6px; border: 1px solid var(--auto-trades-border, #4a4c4e);" />
                            </div>
                            
                            <div style="background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #00A2FF;">Step 3: Copy the Secret Key</h4>
                                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">
                                    You'll see a long text code (like "JUJRHLQRH2OUFIDRYTV7ZJQ2UA"). Copy this entire code and paste it in the field when you go back.
                                </p>
                                <img src="${getTutorialImagePath('step3')}" alt="Step 3" style="width: 100%; border-radius: 6px; border: 1px solid var(--auto-trades-border, #4a4c4e); margin-bottom: 12px;" />
                                <div style="padding: 12px; background: rgba(0, 162, 255, 0.1); border-left: 3px solid #00A2FF; border-radius: 4px;">
                                    <p style="margin: 0; font-size: 13px; color: #bdbebe; font-family: monospace;">
                                        Example: JUJRHLQRH2OUFIDRYTV7ZJQ2UA
                                    </p>
                                </div>
                            </div>
                            
                            <div style="background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 8px; padding: 20px;">
                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #00A2FF;">Step 4: Return to QR Code</h4>
                                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">
                                    After copying the code, you can go back to the QR code view and complete setup normally. The extension will use the secret code you provide.
                                </p>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button id="tutorial-back" style="background: transparent; color: var(--auto-trades-text-secondary, #bdbebe); border: 1px solid var(--auto-trades-border, #4a4c4e); padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                Back
                            </button>
                        </div>
                    </div>
                `;

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
                dialog.innerHTML = `
                    <div style="padding: 28px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">
                            Enter 2FA Secret Key
                        </h3>
                        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">
                            Enter your Roblox authenticator secret key. This will be encrypted and stored securely.
                        </p>
                        
                        <div style="margin-bottom: 20px; padding: 12px; background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 8px; margin-bottom: 20px;">
                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                <span style="font-size: 18px; line-height: 1;">⚠️</span>
                                <div style="flex: 1;">
                                    <strong style="color: #dc3545; font-size: 13px; display: block; margin-bottom: 4px;">SECURITY WARNING</strong>
                                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: var(--auto-trades-text-secondary, #bdbebe);">
                                        Never share this secret key with anyone. Roblox will never ask you for this code. Keep it secure and private.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">
                                2FA Secret Key
                            </label>
                            <div style="position: relative;">
                                <input 
                                    type="password" 
                                    class="secret-input-field"
                                    placeholder="JUJRHLQRH2OUFIDRYTV7ZJQ2UA"
                                    autocomplete="off"
                                    spellcheck="false"
                                    style="width: 100%; padding: 12px 45px 12px 12px; background: var(--auto-trades-bg-secondary, #2a2d30); border: 1px solid var(--auto-trades-border, #4a4c4e); border-radius: 8px; color: var(--auto-trades-text-primary, #ffffff); font-size: 14px; font-family: monospace; box-sizing: border-box;"
                                />
                                <button id="secret-toggle" type="button" style="
                                    position: absolute;
                                    right: 12px;
                                    top: 50%;
                                    transform: translateY(-50%);
                                    background: transparent;
                                    border: none;
                                    color: var(--auto-trades-text-secondary, #bdbebe);
                                    cursor: pointer;
                                    padding: 4px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 18px;
                                    transition: color 0.2s;
                                " title="Show/Hide secret">👁️</button>
                            </div>
                            <small style="display: block; margin-top: 8px; font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe);">
                                Need help? Click the tutorial button below.
                            </small>
                        </div>
                        
                        <div style="display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
                            <button id="twofa-tutorial-btn" style="background: transparent; color: #00A2FF; border: 1px solid #00A2FF; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                📖 Tutorial
                            </button>
                            <button id="twofa-cancel-btn" style="background: transparent; color: var(--auto-trades-text-secondary, #bdbebe); border: 1px solid var(--auto-trades-border, #4a4c4e); padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                Cancel
                            </button>
                            <button id="twofa-save-btn" style="background: #00A2FF; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0, 162, 255, 0.3);">
                                Save
                            </button>
                        </div>
                    </div>
                `;

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
                        }, 2000);
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
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.7);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Source Sans Pro', Arial, sans-serif;
                animation: fadeIn 0.2s ease-out;
                padding: 20px;
                box-sizing: border-box;
            `;

            const dialog = document.createElement('div');
            dialog.className = 'extension-dialog-password';
            dialog.style.cssText = `
                background: var(--auto-trades-bg-primary, #393b3d);
                border: 1px solid var(--auto-trades-border, #4a4c4e);
                border-radius: 12px;
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
                max-width: 480px;
                width: 100%;
                min-width: 320px;
                color: var(--auto-trades-text-primary, #ffffff);
                position: relative;
            `;

            dialog.innerHTML = `
                <div style="padding: 28px 28px 24px; border-bottom: 1px solid var(--auto-trades-border, #4a4c4e);">
                    <div style="display: flex; align-items: flex-start; gap: 16px;">
                        <div style="font-size: 36px; line-height: 1; flex-shrink: 0; margin-top: 2px;">🔒</div>
                        <div style="flex: 1; min-width: 0;">
                            <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff); line-height: 1.4;">
                                ${title}
                            </h3>
                            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe);">
                                ${message}
                            </p>
                        </div>
                    </div>
                </div>
                <div style="padding: 24px 28px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">
                            Password
                        </label>
                        <div style="position: relative;">
                            <input type="password" id="password-input" class="password-input-field" placeholder="Enter your password" style="
                                width: 100%;
                                padding: 12px 45px 12px 16px;
                                background: var(--auto-trades-bg-secondary, #2a2d30);
                                border: 1px solid var(--auto-trades-border, #4a4c4e);
                                border-radius: 8px;
                                color: var(--auto-trades-text-primary, #ffffff);
                                font-size: 15px;
                                box-sizing: border-box;
                                outline: none;
                                transition: border-color 0.2s;
                            " />
                            <button id="password-toggle" type="button" style="
                                position: absolute;
                                right: 12px;
                                top: 50%;
                                transform: translateY(-50%);
                                background: transparent;
                                border: none;
                                color: var(--auto-trades-text-secondary, #bdbebe);
                                cursor: pointer;
                                padding: 4px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 18px;
                                transition: color 0.2s;
                            " title="Show/Hide password">👁️</button>
                        </div>
                        <p id="password-error" style="margin: 8px 0 0 0; font-size: 13px; color: #dc3545; display: none;">Password not correct</p>
                        ${isRetry ? '<p style="margin: 8px 0 0 0; font-size: 13px; color: #dc3545;">Incorrect password. Please try again.</p>' : ''}
                        <p style="margin: 12px 0 0 0; font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe); line-height: 1.5; text-align: center;">
                            Note: This is not your Roblox password. This is the password you set when configuring your 2FA secret.
                        </p>
                    </div>
                </div>
                <div style="padding: 20px 28px; display: flex; gap: 12px; justify-content: flex-end; background: var(--auto-trades-bg-secondary, #2a2d30); border-radius: 0 0 12px 12px;">
                    <button id="password-cancel" class="extension-dialog-btn" style="
                        background: transparent;
                        color: var(--auto-trades-text-secondary, #bdbebe);
                        border: 1px solid var(--auto-trades-border, #4a4c4e);
                        padding: 12px 28px;
                        border-radius: 8px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">Cancel</button>
                    <button id="password-submit" class="extension-dialog-btn extension-dialog-btn-primary" style="
                        background: #00A2FF;
                        color: white;
                        border: none;
                        padding: 12px 28px;
                        border-radius: 8px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 2px 8px rgba(0, 162, 255, 0.3);
                    ">Submit</button>
                </div>
            `;

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
        show2FASecretDialog,
        showPasswordPrompt
    };

})();
