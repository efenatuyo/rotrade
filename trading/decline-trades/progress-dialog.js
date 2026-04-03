(function () {
    'use strict';
    let progressDialog = null;
    function createProgressDialog(onStop) {
        const overlay = document.createElement('div');
        overlay.className = 'decline-trades-overlay';
        overlay.style.cssText = `\n            position: fixed;\n            top: 0;\n            left: 0;\n            width: 100vw;\n            height: 100vh;\n            background: rgba(0, 0, 0, 0.6);\n            z-index: 1000;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-family: 'Source Sans Pro', Arial, sans-serif;\n            animation: fadeIn 0.2s ease-out;\n            padding: 20px;\n            box-sizing: border-box;\n            pointer-events: none;\n        `;
        const dialog = document.createElement('div');
        dialog.className = 'decline-trades-dialog';
        dialog.style.cssText = `\n            background: var(--auto-trades-bg-primary, #393b3d);\n            border: 1px solid var(--auto-trades-border, #4a4c4e);\n            border-radius: 12px;\n            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);\n            max-width: 500px;\n            width: 100%;\n            min-width: 400px;\n            padding: 28px;\n            margin: 0;\n            animation: slideUp 0.3s ease-out;\n            color: var(--auto-trades-text-primary, #ffffff);\n            position: relative;\n        `;
        dialog.innerHTML = `\n            <div style="margin-bottom: 24px;">\n                <h3 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">\n                    Declining Trades\n                </h3>\n                \n                <div style="margin-top: 24px;">\n                    <div style="background: #2a2d30; border-radius: 20px; height: 24px; overflow: hidden; position: relative;">\n                        <div id="decline-progress-bar" style="background: #dc3545; height: 100%; width: 0%; transition: width 0.3s ease; border-radius: 20px;"></div>\n                    </div>\n                    <div style="text-align: center; margin-top: 12px; font-size: 14px; color: var(--auto-trades-text-secondary, #bdbebe);">\n                        <span id="decline-progress-text">0 / 0 trades declined</span>\n                    </div>\n                </div>\n                \n                <div style="margin-top: 16px; text-align: center; font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe);">\n                    <span id="decline-failed-count-text">Failed: 0</span>\n                </div>\n                \n                <div style="margin-top: 24px; display: flex; justify-content: center;">\n                    <button id="stop-declining-btn" style="background: #dc3545; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">\n                        Stop\n                    </button>\n                </div>\n            </div>\n        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        const stopBtn = overlay.querySelector('#stop-declining-btn');
        const dialogElement = overlay.querySelector('.decline-trades-dialog');
        if (dialogElement) {
            dialogElement.style.pointerEvents = 'auto';
        }
        if (stopBtn && onStop) {
            stopBtn.style.pointerEvents = 'auto';
            stopBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                stopBtn.textContent = 'Stopping...';
                stopBtn.disabled = true;
                onStop();
            });
        }
        overlay.style.pointerEvents = 'auto';
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        overlay.style.zIndex = '10000';
        progressDialog = overlay;
        return overlay;
    }
    function updateProgressDialog(declined, total, failed = 0) {
        if (!progressDialog) return;
        const progressBar = progressDialog.querySelector('#decline-progress-bar');
        const progressText = progressDialog.querySelector('#decline-progress-text');
        const failedCountText = progressDialog.querySelector('#decline-failed-count-text');
        if (progressBar && window.ProgressOverlay) {
            window.ProgressOverlay.setBarFraction(progressBar, declined, total);
        }
        if (progressText) {
            progressText.textContent = `${declined} / ${total} trades declined`;
        }
        if (failedCountText) {
            failedCountText.textContent = `Failed: ${failed}`;
        }
    }
    function closeProgressDialog() {
        if (!progressDialog || !window.ProgressOverlay) {
            return;
        }
        const el = progressDialog;
        window.ProgressOverlay.closeWithFade(el, function () {
            progressDialog = null;
        });
    }
    function getProgressDialog() {
        return progressDialog;
    }
    const DeclineProgressDialog = {
        create: createProgressDialog,
        update: updateProgressDialog,
        close: closeProgressDialog,
        get: getProgressDialog,
    };
    if (typeof window !== 'undefined') {
        window.DeclineProgressDialog = DeclineProgressDialog;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DeclineProgressDialog;
    }
    if (typeof exports !== 'undefined') {
        Object.assign(exports, DeclineProgressDialog);
    }
})();
