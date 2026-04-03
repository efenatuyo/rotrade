(function () {
    'use strict';
    function createDialogOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'extension-dialog-overlay';
        overlay.style.cssText = `\n            position: fixed;\n            top: 0;\n            left: 0;\n            width: 100vw;\n            height: 100vh;\n            background: rgba(0, 0, 0, 0.6);\n            z-index: 999999;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-family: 'Source Sans Pro', Arial, sans-serif;\n            animation: fadeIn 0.2s ease-out;\n            padding: 20px;\n            box-sizing: border-box;\n        `;
        return overlay;
    }
    function createDialogBox(title, message, type = 'alert') {
        const dialog = document.createElement('div');
        dialog.className = 'extension-dialog';
        dialog.style.cssText = `\n            background: var(--auto-trades-bg-primary, #393b3d);\n            border: 1px solid var(--auto-trades-border, #4a4c4e);\n            border-radius: 12px;\n            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);\n            max-width: 480px;\n            width: 100%;\n            min-width: 320px;\n            padding: 0;\n            margin: 0;\n            animation: slideUp 0.3s ease-out;\n            color: var(--auto-trades-text-primary, #ffffff);\n            position: relative;\n            overflow: hidden;\n        `;
        const icon = type === 'confirm' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';
        const iconColor = type === 'confirm' ? '#ffc107' : type === 'error' ? '#dc3545' : '#00A2FF';
        dialog.innerHTML = `\n            <div style="padding: 28px 28px 24px; border-bottom: 1px solid var(--auto-trades-border, #4a4c4e);">\n                <div style="display: flex; align-items: flex-start; gap: 16px;">\n                    <div style="font-size: 36px; line-height: 1; flex-shrink: 0; margin-top: 2px;">${icon}</div>\n                    <div style="flex: 1; min-width: 0;">\n                        <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff); line-height: 1.4; letter-spacing: -0.3px;">\n                            ${title}\n                        </h3>\n                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: var(--auto-trades-text-secondary, #bdbebe); word-wrap: break-word;">\n                            ${message}\n                        </p>\n                    </div>\n                </div>\n            </div>\n            <div class="extension-dialog-buttons" style="padding: 20px 28px; display: flex; gap: 12px; justify-content: flex-end; background: var(--auto-trades-bg-secondary, #2a2d30);">\n            </div>\n        `;
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
            okButton.style.cssText = `\n                background: #00A2FF;\n                color: white;\n                border: none;\n                padding: 12px 28px;\n                border-radius: 8px;\n                font-size: 15px;\n                font-weight: 600;\n                cursor: pointer;\n                transition: all 0.2s ease;\n                min-width: 100px;\n                box-shadow: 0 2px 8px rgba(0, 162, 255, 0.3);\n            `;
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
    function showConfirm(
        title,
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        options = {}
    ) {
        return new Promise((resolve) => {
            const overlay = createDialogOverlay();
            const dialog = createDialogBox(title, message, 'confirm');
            const messageContainer = dialog.querySelector('p');
            if (options.checkbox) {
                const checkboxContainer = document.createElement('div');
                checkboxContainer.style.cssText =
                    'margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--auto-trades-border, #4a4c4e); display: flex; align-items: center;';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'extension-dialog-checkbox';
                checkbox.style.cssText = 'margin-right: 8px; cursor: pointer; flex-shrink: 0;';
                const label = document.createElement('label');
                label.htmlFor = 'extension-dialog-checkbox';
                label.textContent = options.checkbox.label || '';
                label.style.cssText =
                    'cursor: pointer; font-size: 14px; color: var(--auto-trades-text-secondary, #bdbebe); display: inline; margin: 0;';
                checkboxContainer.appendChild(checkbox);
                checkboxContainer.appendChild(label);
                messageContainer.parentElement.appendChild(checkboxContainer);
                dialog.checkbox = checkbox;
            }
            const buttonsContainer = dialog.querySelector('.extension-dialog-buttons');
            const cancelButton = document.createElement('button');
            cancelButton.textContent = cancelText;
            cancelButton.className = 'extension-dialog-btn extension-dialog-btn-secondary';
            cancelButton.style.cssText = `\n                background: transparent;\n                color: var(--auto-trades-text-secondary, #bdbebe);\n                border: 1px solid var(--auto-trades-border, #4a4c4e);\n                padding: 12px 28px;\n                border-radius: 8px;\n                font-size: 15px;\n                font-weight: 600;\n                cursor: pointer;\n                transition: all 0.2s ease;\n                min-width: 100px;\n            `;
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.background = 'transparent';
            });
            const confirmButton = document.createElement('button');
            confirmButton.textContent = confirmText;
            confirmButton.className = 'extension-dialog-btn extension-dialog-btn-primary';
            confirmButton.style.cssText = `\n                background: #ff6b35;\n                color: white;\n                border: none;\n                padding: 12px 28px;\n                border-radius: 8px;\n                font-size: 15px;\n                font-weight: 600;\n                cursor: pointer;\n                transition: all 0.2s ease;\n                min-width: 100px;\n                box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);\n            `;
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
            confirmButton.addEventListener('click', () => {
                if (dialog.checkbox) {
                    const checkboxValue = dialog.checkbox.checked;
                    closeDialog({
                        confirmed: true,
                        checkbox: checkboxValue,
                    });
                } else {
                    closeDialog(true);
                }
            });
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
        confirm: showConfirm,
    };
    window.extensionAlert = showAlert;
    window.extensionConfirm = showConfirm;
})();
