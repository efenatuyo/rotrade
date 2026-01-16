(function() {
    'use strict';

    function createDialogOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'extension-dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Source Sans Pro', Arial, sans-serif;
            animation: fadeIn 0.2s ease-out;
            padding: 20px;
            box-sizing: border-box;
        `;
        return overlay;
    }

    function createDialogBox(title, message, type = 'alert') {
        const dialog = document.createElement('div');
        dialog.className = 'extension-dialog';
        dialog.style.cssText = `
            background: var(--auto-trades-bg-primary, #393b3d);
            border: 1px solid var(--auto-trades-border, #4a4c4e);
            border-radius: 12px;
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
            max-width: 480px;
            width: 100%;
            min-width: 320px;
            padding: 0;
            margin: 0;
            animation: slideUp 0.3s ease-out;
            color: var(--auto-trades-text-primary, #ffffff);
            position: relative;
            overflow: hidden;
        `;

        const icon = type === 'confirm' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';
        const iconColor = type === 'confirm' ? '#ffc107' : type === 'error' ? '#dc3545' : '#00A2FF';

        dialog.innerHTML = `
            <div style="padding: 28px 28px 24px; border-bottom: 1px solid var(--auto-trades-border, #4a4c4e);">
                <div style="display: flex; align-items: flex-start; gap: 16px;">
                    <div style="font-size: 36px; line-height: 1; flex-shrink: 0; margin-top: 2px;">${icon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff); line-height: 1.4; letter-spacing: -0.3px;">
                            ${title}
                        </h3>
                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe); word-wrap: break-word;">
                            ${message}
                        </p>
                    </div>
                </div>
            </div>
            <div class="extension-dialog-buttons" style="padding: 20px 28px; display: flex; gap: 12px; justify-content: flex-end; background: var(--auto-trades-bg-secondary, #2a2d30);">
            </div>
        `;

        return dialog;
    }

    function showAlert(title, message, type = 'info') {
        return new Promise((resolve) => {
            const overlay = createDialogOverlay();
            const dialog = createDialogBox(title, message, type);
            const buttonsContainer = dialog.querySelector('.extension-dialog-buttons');

            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.className = 'extension-dialog-btn extension-dialog-btn-primary';
            okButton.style.cssText = `
                background: #00A2FF;
                color: white;
                border: none;
                padding: 12px 28px;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 100px;
                box-shadow: 0 2px 8px rgba(0, 162, 255, 0.3);
            `;

            okButton.addEventListener('mouseenter', () => {
                okButton.style.background = '#0088cc';
            });

            okButton.addEventListener('mouseleave', () => {
                okButton.style.background = '#00A2FF';
            });

            okButton.addEventListener('click', () => {
                overlay.style.animation = 'fadeOut 0.2s ease-out';
                dialog.style.animation = 'slideDown 0.2s ease-out';
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 200);
            });

            buttonsContainer.appendChild(okButton);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    okButton.click();
                }
            });

            okButton.focus();
        });
    }

    function showConfirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            const overlay = createDialogOverlay();
            const dialog = createDialogBox(title, message, 'confirm');
            const buttonsContainer = dialog.querySelector('.extension-dialog-buttons');

            const cancelButton = document.createElement('button');
            cancelButton.textContent = cancelText;
            cancelButton.className = 'extension-dialog-btn extension-dialog-btn-secondary';
            cancelButton.style.cssText = `
                background: transparent;
                color: var(--auto-trades-text-secondary, #bdbebe);
                border: 1px solid var(--auto-trades-border, #4a4c4e);
                padding: 12px 28px;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 100px;
            `;

            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.background = 'rgba(255, 255, 255, 0.1)';
            });

            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.background = 'transparent';
            });

            const confirmButton = document.createElement('button');
            confirmButton.textContent = confirmText;
            confirmButton.className = 'extension-dialog-btn extension-dialog-btn-primary';
            confirmButton.style.cssText = `
                background: #ff6b35;
                color: white;
                border: none;
                padding: 12px 28px;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 100px;
                box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
            `;

            confirmButton.addEventListener('mouseenter', () => {
                confirmButton.style.background = '#e55a2b';
            });

            confirmButton.addEventListener('mouseleave', () => {
                confirmButton.style.background = '#ff6b35';
            });

            const closeDialog = (result) => {
                overlay.style.animation = 'fadeOut 0.2s ease-out';
                dialog.style.animation = 'slideDown 0.2s ease-out';
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 200);
            };

            cancelButton.addEventListener('click', () => closeDialog(false));
            confirmButton.addEventListener('click', () => closeDialog(true));

            buttonsContainer.appendChild(cancelButton);
            buttonsContainer.appendChild(confirmButton);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeDialog(false);
                }
            });

            const handleKeyPress = (e) => {
                if (e.key === 'Escape') {
                    closeDialog(false);
                    document.removeEventListener('keydown', handleKeyPress);
                } else if (e.key === 'Enter') {
                    closeDialog(true);
                    document.removeEventListener('keydown', handleKeyPress);
                }
            };

            document.addEventListener('keydown', handleKeyPress);
            confirmButton.focus();
        });
    }

    window.Dialogs = {
        alert: showAlert,
        confirm: showConfirm
    };

    window.extensionAlert = showAlert;
    window.extensionConfirm = showConfirm;
})();
