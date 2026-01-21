(function() {
    'use strict';

    let progressDialog = null;

    function createProgressDialog(onStop) {
        const overlay = document.createElement('div');
        overlay.className = 'decline-trades-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Source Sans Pro', Arial, sans-serif;
            animation: fadeIn 0.2s ease-out;
            padding: 20px;
            box-sizing: border-box;
            pointer-events: none;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'decline-trades-dialog';
        dialog.style.cssText = `
            background: var(--auto-trades-bg-primary, #393b3d);
            border: 1px solid var(--auto-trades-border, #4a4c4e);
            border-radius: 12px;
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
            max-width: 500px;
            width: 100%;
            min-width: 400px;
            padding: 28px;
            margin: 0;
            animation: slideUp 0.3s ease-out;
            color: var(--auto-trades-text-primary, #ffffff);
            position: relative;
        `;

        dialog.innerHTML = `
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: var(--auto-trades-text-primary, #ffffff);">
                    Declining Trades
                </h3>
                
                <div style="margin-top: 24px;">
                    <div style="background: #2a2d30; border-radius: 20px; height: 24px; overflow: hidden; position: relative;">
                        <div id="decline-progress-bar" style="background: #dc3545; height: 100%; width: 0%; transition: width 0.3s ease; border-radius: 20px;"></div>
                    </div>
                    <div style="text-align: center; margin-top: 12px; font-size: 14px; color: var(--auto-trades-text-secondary, #bdbebe);">
                        <span id="decline-progress-text">0 / 0 trades declined</span>
                    </div>
                </div>
                
                <div style="margin-top: 16px; text-align: center; font-size: 12px; color: var(--auto-trades-text-secondary, #bdbebe);">
                    <span id="decline-failed-count-text">Failed: 0</span>
                </div>
                
                <div style="margin-top: 24px; display: flex; justify-content: center;">
                    <button id="stop-declining-btn" style="background: #dc3545; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                        Stop
                    </button>
                </div>
            </div>
        `;

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

        if (progressBar) {
            const percentage = total > 0 ? (declined / total) * 100 : 0;
            progressBar.style.width = `${percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `${declined} / ${total} trades declined`;
        }

        if (failedCountText) {
            failedCountText.textContent = `Failed: ${failed}`;
        }
    }

    function closeProgressDialog() {
        if (progressDialog) {
            progressDialog.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                if (progressDialog && progressDialog.parentNode) {
                    progressDialog.remove();
                }
                progressDialog = null;
            }, 200);
        }
    }

    function getProgressDialog() {
        return progressDialog;
    }

    const DeclineProgressDialog = {
        create: createProgressDialog,
        update: updateProgressDialog,
        close: closeProgressDialog,
        get: getProgressDialog
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
