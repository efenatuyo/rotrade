(function () {
    'use strict';

    let activePopup = null;

    function escapeText(value) {
        const sanitizer =
            window.SecurityUtils && window.SecurityUtils.sanitizeHtml
                ? window.SecurityUtils.sanitizeHtml
                : (v) => {
                      const d = document.createElement('div');
                      d.textContent = String(v ?? '');
                      return d.innerHTML;
                  };
        return sanitizer(value);
    }

    function buildTitle(data, itemId, itemName) {
        if (data && data.item_name && data.acronym) {
            return `Proofs for ${data.item_name} [${data.acronym}]`;
        }
        if (data && data.item_name) {
            return `Proofs for ${data.item_name}`;
        }
        if (itemName) {
            return `Proofs for ${itemName}`;
        }
        if (itemId) {
            return `Proofs for Item ${itemId}`;
        }
        return 'Proofs';
    }

    function injectSpinnerStyles() {
        if (document.getElementById('proofs-popup-styles')) return;
        const style = document.createElement('style');
        style.id = 'proofs-popup-styles';
        style.textContent = `
            @keyframes proofs-popup-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .proofs-popup-spinner {
                width: 48px;
                height: 48px;
                border: 4px solid rgba(255, 255, 255, 0.12);
                border-top-color: #00A2FF;
                border-radius: 50%;
                animation: proofs-popup-spin 0.8s linear infinite;
            }
            .proofs-popup-tabbar {
                display: flex;
                align-items: stretch;
                gap: 0;
                padding: 0 30px;
                border-bottom: 1px solid var(--auto-trades-border, #4a4c4e);
                background: var(--auto-trades-bg-secondary, #2a2d30);
            }
            .proofs-popup-tab {
                appearance: none;
                background: transparent;
                color: var(--auto-trades-text-secondary, #bdbebe);
                border: none;
                border-bottom: 2px solid transparent;
                padding: 14px 22px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                margin-bottom: -1px;
                transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
            }
            .proofs-popup-tab:hover {
                color: var(--auto-trades-text-primary, #ffffff);
            }
            .proofs-popup-tab.is-active {
                color: #00A2FF;
                border-bottom-color: #00A2FF;
            }
            .proofs-popup-subbar {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 30px;
                border-bottom: 1px solid var(--auto-trades-border, #4a4c4e);
                background: var(--auto-trades-bg-primary, #393b3d);
            }
            .proofs-popup-subtab {
                appearance: none;
                background: transparent;
                color: var(--auto-trades-text-secondary, #bdbebe);
                border: 1px solid var(--auto-trades-border, #4a4c4e);
                padding: 7px 14px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                border-radius: 6px;
                transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
            }
            .proofs-popup-subtab:hover {
                color: var(--auto-trades-text-primary, #ffffff);
            }
            .proofs-popup-subtab.is-active {
                color: #fff;
                background: #00A2FF;
                border-color: #00A2FF;
            }
            .proofs-popup-moves {
                margin-left: auto;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: var(--auto-trades-text-secondary, #bdbebe);
                cursor: pointer;
                user-select: none;
            }
            .proofs-popup-moves input {
                margin: 0;
                width: 16px;
                height: 16px;
                cursor: pointer;
                accent-color: #00A2FF;
            }
            .proofs-popup-list {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: 18px 22px;
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            .proofs-popup-trade {
                background: var(--auto-trades-bg-secondary, #2a2d30);
                border: 1px solid var(--auto-trades-border, #4a4c4e);
                border-radius: 10px;
                padding: 14px 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .proofs-popup-trade-head {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 13px;
                color: var(--auto-trades-text-secondary, #bdbebe);
            }
            .proofs-popup-kind {
                display: inline-flex;
                align-items: center;
                padding: 2px 9px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .proofs-popup-kind.is-trade {
                background: rgba(0, 162, 255, 0.18);
                color: #00A2FF;
            }
            .proofs-popup-kind.is-move {
                background: rgba(189, 190, 190, 0.15);
                color: var(--auto-trades-text-secondary, #bdbebe);
            }
            .proofs-popup-time {
                cursor: help;
            }
            .proofs-popup-tier {
                display: inline-flex;
                align-items: center;
                padding: 1px 7px;
                border-radius: 999px;
                background: rgba(255,255,255,0.06);
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }
            .proofs-popup-parties {
                display: flex;
                align-items: center;
                gap: 14px;
                flex-wrap: wrap;
            }
            .proofs-popup-party {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--auto-trades-text-primary, #ffffff);
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
            }
            .proofs-popup-party:hover {
                color: #00A2FF;
            }
            .proofs-popup-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(255,255,255,0.08);
                object-fit: cover;
                flex-shrink: 0;
            }
            .proofs-popup-arrow {
                color: var(--auto-trades-text-secondary, #bdbebe);
                font-size: 18px;
                line-height: 1;
            }
            .proofs-popup-sides {
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                gap: 12px;
            }
            @media (max-width: 640px) {
                .proofs-popup-sides {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
            .proofs-popup-side {
                background: var(--auto-trades-bg-primary, #393b3d);
                border: 1px solid var(--auto-trades-border, #4a4c4e);
                border-radius: 8px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-height: 60px;
                min-width: 0;
                overflow: hidden;
            }
            .proofs-popup-side-label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--auto-trades-text-secondary, #bdbebe);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .proofs-popup-items {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .proofs-popup-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: var(--auto-trades-text-primary, #ffffff);
                text-decoration: none;
                padding: 4px 6px;
                border-radius: 6px;
                transition: background 0.12s ease;
            }
            a.proofs-popup-item {
                color: var(--auto-trades-text-primary, #ffffff);
            }
            a.proofs-popup-item:hover {
                background: rgba(255, 255, 255, 0.06);
                color: var(--auto-trades-text-primary, #ffffff);
                text-decoration: none;
            }
            .proofs-popup-item-value.is-robux {
                color: var(--auto-trades-text-secondary, #bdbebe);
                font-weight: 500;
            }
            .proofs-popup-side-label .icon-robux-16x16 {
                margin-right: 3px;
            }
            .proofs-popup-item-thumb {
                width: 38px;
                height: 38px;
                border-radius: 6px;
                background: rgba(255,255,255,0.04);
                object-fit: contain;
                flex-shrink: 0;
            }
            .proofs-popup-item-name {
                flex: 1 1 auto;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .proofs-popup-item-value {
                flex-shrink: 0;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-weight: 600;
                color: #00A2FF;
                font-size: 13px;
            }
            .proofs-popup-item-value.is-null {
                color: var(--auto-trades-text-secondary, #bdbebe);
                font-weight: 400;
            }
            .proofs-popup-rolimons-icon {
                display: inline-block;
                width: 14px;
                height: 14px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                flex-shrink: 0;
            }
            .proofs-popup-side-label .proofs-popup-rolimons-icon {
                margin-right: 3px;
                transform: translateY(1px);
            }
            .proofs-popup-side-empty {
                color: var(--auto-trades-text-secondary, #bdbebe);
                font-size: 12px;
                font-style: italic;
            }
            .proofs-popup-state {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 30px;
                color: var(--auto-trades-text-secondary, #bdbebe);
                text-align: center;
                font-size: 15px;
            }
        `;
        document.head.appendChild(style);
    }

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'extension-dialog-overlay proofs-popup-overlay';
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
            padding: 24px;
            box-sizing: border-box;
        `;
        return overlay;
    }

    function createDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'extension-dialog proofs-popup-dialog';
        dialog.style.cssText = `
            background: var(--auto-trades-bg-primary, #393b3d);
            border: 1px solid var(--auto-trades-border, #4a4c4e);
            border-radius: 14px;
            box-shadow: 0 16px 56px rgba(0, 0, 0, 0.55);
            width: min(1140px, 96vw);
            height: min(1040px, 94vh);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
            color: var(--auto-trades-text-primary, #ffffff);
        `;
        return dialog;
    }

    function formatRelative(ms) {
        if (!ms) return '';
        const diff = Date.now() - Number(ms);
        if (!isFinite(diff)) return '';
        if (diff < 0) return 'in the future';
        if (diff < 60_000) return 'just now';
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
        if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
        const months = Math.floor(diff / (30 * 86_400_000));
        if (months < 12) return `${months}mo ago`;
        return `${Math.floor(months / 12)}y ago`;
    }

    function formatAbsolute(ms) {
        if (!ms) return '';
        try {
            return new Date(Number(ms)).toLocaleString();
        } catch {
            return '';
        }
    }

    function formatNumber(n) {
        const v = Number(n);
        if (!isFinite(v)) return null;
        return Math.round(v).toLocaleString('en-US');
    }

    function normalizeContext(arg1, arg2) {
        if (arg1 && typeof arg1 === 'object') {
            return {
                itemId: arg1.itemId || null,
                itemName: arg1.itemName || null,
                ciid: arg1.ciid || null,
                uaid: arg1.uaid || null,
            };
        }
        return {
            itemId: arg1 || null,
            itemName: arg2 || null,
            ciid: null,
            uaid: null,
        };
    }

    function show(arg1, arg2) {
        if (activePopup) {
            return;
        }

        const context = normalizeContext(arg1, arg2);
        const { itemId, itemName, ciid } = context;

        injectSpinnerStyles();

        const overlay = createOverlay();
        const dialog = createDialog();

        const hasCiid = !!(ciid && String(ciid).trim());

        dialog.innerHTML = `
            <div class="proofs-popup-header" style="display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 22px 30px; border-bottom: 1px solid var(--auto-trades-border, #4a4c4e);">
                <div style="min-width: 0; flex: 1;">
                    <h3 class="proofs-popup-title" style="margin: 0; font-size: 24px; font-weight: 600; line-height: 1.3; color: var(--auto-trades-text-primary, #ffffff); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></h3>
                    <div class="proofs-popup-count" style="margin-top: 6px; font-size: 15px; color: var(--auto-trades-text-secondary, #bdbebe);"></div>
                </div>
                <button class="proofs-popup-close" type="button" aria-label="Close" style="background: transparent; border: none; color: var(--auto-trades-text-secondary, #bdbebe); font-size: 32px; line-height: 1; cursor: pointer; padding: 6px 14px; border-radius: 8px; flex-shrink: 0;">&times;</button>
            </div>
            <div class="proofs-popup-tabbar" role="tablist">
                <button class="proofs-popup-tab is-active" type="button" data-track="images" role="tab">Proofs</button>
                <button class="proofs-popup-tab" type="button" data-track="trades" role="tab">Trade History</button>
            </div>
            <div class="proofs-popup-track-images proofs-popup-body" style="flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;">
                <div class="proofs-popup-body-inner" style="flex: 1; min-height: 0; overflow: hidden; display: flex;">
                    <div class="proofs-popup-loading" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; color: var(--auto-trades-text-secondary, #bdbebe); text-align: center;">
                        <div class="proofs-popup-spinner" style="margin-bottom: 22px;"></div>
                        <div style="font-size: 17px;">Loading proofs...</div>
                        <div style="margin-top: 10px; font-size: 14px; opacity: 0.7;">Please wait while we fetch the trade proofs</div>
                    </div>
                    <div class="proofs-popup-error" style="display: none; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; color: #dc3545; text-align: center;">
                        <div style="font-size: 52px; margin-bottom: 18px; opacity: 0.7;">&#9888;</div>
                        <div style="font-size: 18px; margin-bottom: 10px;">Error loading proofs</div>
                        <div class="proofs-popup-error-message" style="font-size: 14px; opacity: 0.8; color: var(--auto-trades-text-secondary, #bdbebe);"></div>
                    </div>
                    <div class="proofs-popup-empty" style="display: none; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; color: var(--auto-trades-text-secondary, #bdbebe); text-align: center;">
                        <div style="font-size: 17px;">No proofs found for this item.</div>
                    </div>
                    <div class="proofs-popup-content" style="display: none; flex: 1; min-height: 0; overflow: hidden;">
                        <div class="proofs-popup-grid" style="display: flex; flex-direction: column; gap: 0; height: 100%; min-height: 0;">
                            <div class="proofs-popup-image-pane" style="flex: 1 1 auto; min-height: 0; width: 100%; background: var(--auto-trades-bg-secondary, #2a2d30); position: relative; display: flex; align-items: center; justify-content: center; padding: 12px;">
                                <button class="proofs-popup-image-prev" type="button" aria-label="Previous image" style="display: none; position: absolute; left: 14px; top: 50%; transform: translateY(-50%); background: rgba(0, 0, 0, 0.6); color: #fff; border: none; padding: 14px 18px; border-radius: 6px; cursor: pointer; font-size: 22px; z-index: 5;">&larr;</button>
                                <div class="proofs-popup-image-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                                    <div class="proofs-popup-image-spinner proofs-popup-spinner" style="display: none; position: absolute;"></div>
                                    <img class="proofs-popup-image" alt="Trade proof" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px; cursor: zoom-in; display: none;" />
                                </div>
                                <button class="proofs-popup-image-next" type="button" aria-label="Next image" style="display: none; position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: rgba(0, 0, 0, 0.6); color: #fff; border: none; padding: 14px 18px; border-radius: 6px; cursor: pointer; font-size: 22px; z-index: 5;">&rarr;</button>
                                <div class="proofs-popup-image-counter" style="display: none; position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.75); color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 14px;"></div>
                            </div>
                            <div class="proofs-popup-message-pane" style="flex: 0 0 auto; max-height: 180px; width: 100%; box-sizing: border-box; border-top: 1px solid var(--auto-trades-border, #4a4c4e); padding: 18px 28px; overflow-y: auto; font-size: 15px; line-height: 1.55; color: var(--auto-trades-text-primary, #ffffff); white-space: pre-wrap; word-break: break-word; background: var(--auto-trades-bg-primary, #393b3d);"></div>
                        </div>
                    </div>
                </div>
                <div class="proofs-popup-footer" style="display: none; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 30px; border-top: 1px solid var(--auto-trades-border, #4a4c4e); background: var(--auto-trades-bg-secondary, #2a2d30);">
                    <div style="font-size: 15px; color: var(--auto-trades-text-secondary, #bdbebe);">
                        Page <span class="proofs-popup-page-current">1</span>
                        <span style="opacity: 0.75;">of <span class="proofs-popup-page-total">1</span></span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="proofs-popup-prev" type="button" style="background: transparent; color: var(--auto-trades-text-primary, #ffffff); border: 1px solid var(--auto-trades-border, #4a4c4e); padding: 10px 22px; border-radius: 8px; font-size: 15px; cursor: pointer;">Previous</button>
                        <button class="proofs-popup-next" type="button" style="background: #00A2FF; color: #fff; border: none; padding: 10px 22px; border-radius: 8px; font-size: 15px; cursor: pointer;">Next</button>
                    </div>
                </div>
            </div>
            <div class="proofs-popup-track-trades" style="display: none; flex: 1; min-height: 0; overflow: hidden; flex-direction: column;">
                <div class="proofs-popup-subbar">
                    <button class="proofs-popup-subtab" type="button" data-scope="ciid" style="${hasCiid ? '' : 'display: none;'}">This Instance</button>
                    <button class="proofs-popup-subtab" type="button" data-scope="item">All Trades</button>
                    <label class="proofs-popup-moves">
                        <input type="checkbox" class="proofs-popup-moves-toggle" checked>
                        <span>Show moves</span>
                    </label>
                </div>
                <div class="proofs-popup-trades-body" style="flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
                    <div class="proofs-popup-state proofs-popup-trades-loading" style="display: none;">
                        <div class="proofs-popup-spinner" style="margin-bottom: 18px;"></div>
                        <div>Loading trade history...</div>
                    </div>
                    <div class="proofs-popup-state proofs-popup-trades-error" style="display: none; color: #dc3545;">
                        <div style="font-size: 40px; margin-bottom: 12px; opacity: 0.7;">&#9888;</div>
                        <div style="margin-bottom: 8px; font-size: 16px;">Error loading trade history</div>
                        <div class="proofs-popup-trades-error-message" style="font-size: 13px; color: var(--auto-trades-text-secondary, #bdbebe);"></div>
                    </div>
                    <div class="proofs-popup-state proofs-popup-trades-empty" style="display: none;">
                        No trade history for this scope.
                    </div>
                    <div class="proofs-popup-list proofs-popup-trades-list" style="display: none;"></div>
                </div>
            </div>
        `;

        const lightbox = document.createElement('div');
        lightbox.className = 'proofs-popup-lightbox';
        lightbox.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1000001;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 24px;
            box-sizing: border-box;
            cursor: zoom-out;
            animation: fadeIn 0.2s ease-out;
        `;
        lightbox.innerHTML = `
            <button class="proofs-popup-lightbox-close" type="button" aria-label="Close" style="position: absolute; top: 18px; right: 22px; background: rgba(255, 255, 255, 0.1); border: none; color: #fff; font-size: 32px; line-height: 1; cursor: pointer; padding: 6px 14px; border-radius: 8px;">&times;</button>
            <img class="proofs-popup-lightbox-image" alt="Trade proof (enlarged)" style="max-width: 100%; max-height: 100%; border-radius: 6px; cursor: default; display: none;" />
            <div class="proofs-popup-lightbox-spinner proofs-popup-spinner" style="display: none; position: absolute;"></div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        document.body.appendChild(lightbox);

        const titleEl = dialog.querySelector('.proofs-popup-title');
        const countEl = dialog.querySelector('.proofs-popup-count');
        const trackImagesEl = dialog.querySelector('.proofs-popup-track-images');
        const trackTradesEl = dialog.querySelector('.proofs-popup-track-trades');
        const trackButtons = dialog.querySelectorAll('.proofs-popup-tab');
        const loadingEl = dialog.querySelector('.proofs-popup-loading');
        const errorEl = dialog.querySelector('.proofs-popup-error');
        const errorMessageEl = dialog.querySelector('.proofs-popup-error-message');
        const emptyEl = dialog.querySelector('.proofs-popup-empty');
        const contentEl = dialog.querySelector('.proofs-popup-content');
        const footerEl = dialog.querySelector('.proofs-popup-footer');
        const closeBtn = dialog.querySelector('.proofs-popup-close');
        const imageEl = dialog.querySelector('.proofs-popup-image');
        const imageSpinner = dialog.querySelector('.proofs-popup-image-spinner');
        const imageWrapper = dialog.querySelector('.proofs-popup-image-wrapper');
        const imagePrev = dialog.querySelector('.proofs-popup-image-prev');
        const imageNext = dialog.querySelector('.proofs-popup-image-next');
        const imageCounter = dialog.querySelector('.proofs-popup-image-counter');
        const messagePane = dialog.querySelector('.proofs-popup-message-pane');
        const pageCurrentEl = dialog.querySelector('.proofs-popup-page-current');
        const pageTotalEl = dialog.querySelector('.proofs-popup-page-total');
        const prevBtn = dialog.querySelector('.proofs-popup-prev');
        const nextBtn = dialog.querySelector('.proofs-popup-next');
        const lightboxImage = lightbox.querySelector('.proofs-popup-lightbox-image');
        const lightboxSpinner = lightbox.querySelector('.proofs-popup-lightbox-spinner');
        const lightboxClose = lightbox.querySelector('.proofs-popup-lightbox-close');
        const subtabButtons = dialog.querySelectorAll('.proofs-popup-subtab');
        const movesToggle = dialog.querySelector('.proofs-popup-moves-toggle');
        const tradesLoading = dialog.querySelector('.proofs-popup-trades-loading');
        const tradesError = dialog.querySelector('.proofs-popup-trades-error');
        const tradesErrorMessage = dialog.querySelector('.proofs-popup-trades-error-message');
        const tradesEmpty = dialog.querySelector('.proofs-popup-trades-empty');
        const tradesList = dialog.querySelector('.proofs-popup-trades-list');

        titleEl.textContent = buildTitle(null, itemId, itemName);

        let proofs = [];
        let currentProofIndex = 0;
        let currentImageIndex = 0;
        let imageLoadId = 0;
        let lightboxLoadId = 0;
        let lightboxOpen = false;
        let isClosed = false;
        let activeTrack = 'images';
        let activeScope = 'item';
        let showMoves = true;
        const tradesCache = {};
        const tradesInFlight = {};
        const tradesErrors = {};
        let rolimonsItems = null;
        let rolimonsInFlight = false;
        const avatarCache = new Map();
        const avatarFetchInFlight = new Set();

        function resolveAvatar(party, fallback) {
            if (!party) return fallback || '';
            const cached = party.id ? avatarCache.get(String(party.id)) : null;
            if (cached) return cached;
            if (party.avatar) return party.avatar;
            return fallback || '';
        }

        function applyAvatarToDom(userId, url) {
            if (!url) return;
            const sel = `[data-rotrade-avatar-user="${CSS.escape(String(userId))}"]`;
            dialog.querySelectorAll('img.proofs-popup-avatar' + sel).forEach((img) => {
                if (img.getAttribute('src') !== url) {
                    img.src = url;
                    img.style.visibility = '';
                }
            });
            dialog.querySelectorAll('div.proofs-popup-avatar' + sel).forEach((div) => {
                const img = document.createElement('img');
                img.className = 'proofs-popup-avatar';
                img.alt = '';
                img.loading = 'lazy';
                img.src = url;
                img.setAttribute('data-rotrade-avatar-user', String(userId));
                div.replaceWith(img);
            });
        }

        function fetchMissingAvatars(trades) {
            if (!Array.isArray(trades) || trades.length === 0) return;
            const missing = new Set();
            for (let i = 0; i < trades.length; i++) {
                const t = trades[i] || {};
                [t.side_a, t.side_b].forEach((side) => {
                    if (!side || side.id == null) return;
                    const id = String(side.id);
                    if (avatarCache.has(id) || avatarFetchInFlight.has(id)) return;
                    if (side.avatar) return;
                    missing.add(id);
                });
            }
            if (missing.size === 0) return;
            const ids = Array.from(missing);
            ids.forEach((id) => avatarFetchInFlight.add(id));
            const chunks = [];
            for (let i = 0; i < ids.length; i += 100) {
                chunks.push(ids.slice(i, i + 100));
            }
            chunks.forEach((chunk) => {
                fetch(
                    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${chunk.join(',')}&size=150x150&format=Png&isCircular=false`
                )
                    .then((r) => (r.ok ? r.json() : null))
                    .then((data) => {
                        if (isClosed) return;
                        if (data && Array.isArray(data.data)) {
                            data.data.forEach((entry) => {
                                if (!entry || entry.targetId == null) return;
                                const id = String(entry.targetId);
                                if (entry.state === 'Completed' && entry.imageUrl) {
                                    avatarCache.set(id, entry.imageUrl);
                                    applyAvatarToDom(id, entry.imageUrl);
                                }
                            });
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        chunk.forEach((id) => avatarFetchInFlight.delete(id));
                    });
            });
        }

        function lookupValue(assetId) {
            if (!rolimonsItems || assetId == null) return null;
            const normalize =
                window.ProofsLinkExtractor && window.ProofsLinkExtractor.normalizeItemId;
            const keys = [String(assetId)];
            if (normalize) {
                const mapped = normalize(String(assetId));
                if (mapped && mapped !== String(assetId)) keys.push(mapped);
            }
            for (let i = 0; i < keys.length; i++) {
                const arr = rolimonsItems[keys[i]];
                if (Array.isArray(arr)) {
                    if (Number(arr[3]) === -1) return null;
                    const value = Number(arr[4]);
                    if (isFinite(value) && value > 0) return value;
                    return null;
                }
            }
            return null;
        }

        function ensureRolimons(callback) {
            if (rolimonsItems !== null) {
                callback();
                return;
            }
            if (rolimonsInFlight) {
                return;
            }
            rolimonsInFlight = true;
            try {
                chrome.runtime.sendMessage({ action: 'fetchRolimons' }, (resp) => {
                    if (isClosed) return;
                    rolimonsInFlight = false;
                    if (resp && resp.success && resp.data && resp.data.items) {
                        rolimonsItems = resp.data.items;
                    } else {
                        rolimonsItems = {};
                    }
                    callback();
                });
            } catch (e) {
                rolimonsInFlight = false;
                rolimonsItems = {};
                callback();
            }
        }

        function partyLink(party, fallbackAvatar) {
            if (!party) return '';
            const name = escapeText(party.name || `User ${party.id || ''}`.trim());
            const url = party.id
                ? `https://www.roblox.com/users/${encodeURIComponent(party.id)}/profile`
                : '#';
            const avatar = resolveAvatar(party, fallbackAvatar);
            const userIdAttr = party.id
                ? ` data-rotrade-avatar-user="${escapeText(String(party.id))}"`
                : '';
            const avatarHtml = avatar
                ? `<img class="proofs-popup-avatar" src="${escapeText(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"${userIdAttr}>`
                : `<div class="proofs-popup-avatar"${userIdAttr}></div>`;
            return `<a class="proofs-popup-party" href="${escapeText(url)}" target="_blank" rel="noopener noreferrer">${avatarHtml}<span>${name}</span></a>`;
        }

        function rolimonsIconHtml() {
            let url = '';
            try {
                if (chrome && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
                    url = chrome.runtime.getURL('assets/icons/logo.svg');
                }
            } catch {}
            if (!url) return '';
            return `<span class="proofs-popup-rolimons-icon" aria-hidden="true" style="background-image: url('${escapeText(url)}');"></span>`;
        }

        function rolimonsUrl(assetId) {
            if (assetId == null) return null;
            const normalize =
                window.ProofsLinkExtractor && window.ProofsLinkExtractor.normalizeItemId;
            const id = normalize ? normalize(String(assetId)) : String(assetId);
            if (!id) return null;
            return `https://www.rolimons.com/item/${encodeURIComponent(id)}`;
        }

        function valueDisplayHtml(item) {
            const rolimons = lookupValue(item && item.asset_id);
            if (rolimons != null) {
                return `<span class="proofs-popup-item-value">${rolimonsIconHtml()}<span>${escapeText(formatNumber(rolimons))}</span></span>`;
            }
            const rap = Number(item && item.rap);
            if (isFinite(rap) && rap > 0) {
                return `<span class="proofs-popup-item-value is-robux"><span class="icon-robux-16x16"></span><span>${escapeText(formatNumber(rap))}</span></span>`;
            }
            return `<span class="proofs-popup-item-value is-null">&ndash;</span>`;
        }

        function renderItem(item) {
            if (!item) return '';
            const name = escapeText(item.name || 'Unknown item');
            const thumb = item.thumb ? escapeText(item.thumb) : '';
            const serial =
                item.serial && String(item.serial).trim()
                    ? ` <span style="color: var(--auto-trades-text-secondary, #bdbebe); font-weight: 400;">#${escapeText(item.serial)}</span>`
                    : '';
            const thumbHtml = thumb
                ? `<img class="proofs-popup-item-thumb" src="${thumb}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
                : `<div class="proofs-popup-item-thumb"></div>`;
            const inner = `${thumbHtml}<span class="proofs-popup-item-name" title="${name}">${name}${serial}</span>${valueDisplayHtml(item)}`;
            const href = rolimonsUrl(item.asset_id);
            if (href) {
                return `<a class="proofs-popup-item" href="${escapeText(href)}" target="_blank" rel="noopener noreferrer" title="View on Rolimons">${inner}</a>`;
            }
            return `<div class="proofs-popup-item">${inner}</div>`;
        }

        function renderSide(label, items) {
            const safeItems = Array.isArray(items) ? items : [];
            let totalRolimons = 0;
            let anyRolimons = false;
            let totalRap = 0;
            let anyRap = false;
            for (let i = 0; i < safeItems.length; i++) {
                const it = safeItems[i] || {};
                const rolimons = lookupValue(it.asset_id);
                if (rolimons != null) {
                    totalRolimons += rolimons;
                    anyRolimons = true;
                    continue;
                }
                const rap = Number(it.rap);
                if (isFinite(rap) && rap > 0) {
                    totalRap += rap;
                    anyRap = true;
                }
            }
            let totalLabel = '';
            if (anyRolimons) {
                const combined = totalRolimons + totalRap;
                totalLabel = `<span style="display: inline-flex; align-items: center; color: #00A2FF;">${rolimonsIconHtml()}${escapeText(formatNumber(combined))}</span>`;
            } else if (anyRap) {
                totalLabel = `<span style="display: inline-flex; align-items: center; color: var(--auto-trades-text-secondary, #bdbebe);"><span class="icon-robux-16x16"></span>${escapeText(formatNumber(totalRap))}</span>`;
            }
            const body = safeItems.length
                ? `<div class="proofs-popup-items">${safeItems.map(renderItem).join('')}</div>`
                : `<div class="proofs-popup-side-empty">No items</div>`;
            return `<div class="proofs-popup-side">
                <div class="proofs-popup-side-label"><span>${escapeText(label)}</span>${totalLabel}</div>
                ${body}
            </div>`;
        }

        function renderTrade(trade) {
            if (!trade) return '';
            const kind = String(trade.kind || '').toLowerCase();
            const kindClass = kind === 'move' ? 'is-move' : 'is-trade';
            const tier =
                trade.tier && trade.tier !== 'unknown'
                    ? `<span class="proofs-popup-tier">${escapeText(trade.tier)}</span>`
                    : '';
            const tsMs = trade.ts_ms || trade.ts_latest_ms;
            const relative = escapeText(formatRelative(tsMs));
            const absolute = escapeText(formatAbsolute(tsMs));
            const giveLabel = kind === 'move' ? 'Moved' : 'Side A gives';
            const receiveLabel = kind === 'move' ? 'Received by' : 'Side B gives';
            return `<div class="proofs-popup-trade">
                <div class="proofs-popup-trade-head">
                    <span class="proofs-popup-kind ${kindClass}">${escapeText(kind || 'trade')}</span>
                    <span class="proofs-popup-time" title="${absolute}">${relative}</span>
                    ${tier}
                </div>
                <div class="proofs-popup-parties">
                    ${partyLink(trade.side_a, trade.from_avatar)}
                    <span class="proofs-popup-arrow">&rarr;</span>
                    ${partyLink(trade.side_b, trade.to_avatar)}
                </div>
                <div class="proofs-popup-sides">
                    ${renderSide(giveLabel, trade.side_a_items)}
                    ${renderSide(receiveLabel, trade.side_b_items)}
                </div>
            </div>`;
        }

        function close() {
            if (isClosed) return;
            isClosed = true;
            document.removeEventListener('keydown', handleKeyDown);
            overlay.style.animation = 'fadeOut 0.2s ease-out';
            dialog.style.animation = 'slideDown 0.2s ease-out';
            lightbox.style.display = 'none';
            setTimeout(() => {
                overlay.remove();
                lightbox.remove();
                if (activePopup === api) {
                    activePopup = null;
                }
            }, 200);
        }

        function getCurrentAttachmentUrl() {
            const proof = proofs[currentProofIndex];
            const attachments = (proof && proof.attachments) || [];
            return attachments[currentImageIndex] || null;
        }

        function openLightbox() {
            const url = getCurrentAttachmentUrl();
            if (!url) return;
            lightboxOpen = true;
            lightbox.style.display = 'flex';
            const id = ++lightboxLoadId;
            lightboxImage.style.display = 'none';
            lightboxImage.removeAttribute('src');
            lightboxSpinner.style.display = 'block';
            const img = new Image();
            img.onload = () => {
                if (id !== lightboxLoadId || !lightboxOpen) return;
                lightboxImage.src = url;
                lightboxImage.style.display = 'block';
                lightboxSpinner.style.display = 'none';
            };
            img.onerror = () => {
                if (id !== lightboxLoadId || !lightboxOpen) return;
                lightboxSpinner.style.display = 'none';
            };
            img.src = url;
        }

        function closeLightbox() {
            if (!lightboxOpen) return;
            lightboxOpen = false;
            lightbox.style.display = 'none';
            lightboxImage.removeAttribute('src');
            lightboxSpinner.style.display = 'none';
        }

        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                if (lightboxOpen) {
                    closeLightbox();
                } else {
                    close();
                }
                return;
            }
            if (activeTrack !== 'images' || proofs.length === 0) return;
            if (lightboxOpen) {
                if (e.key === 'ArrowRight') {
                    stepImage(1);
                } else if (e.key === 'ArrowLeft') {
                    stepImage(-1);
                }
                return;
            }
            if (e.key === 'ArrowRight') {
                if (currentProofIndex < proofs.length - 1) {
                    currentProofIndex++;
                    renderProof();
                }
            } else if (e.key === 'ArrowLeft') {
                if (currentProofIndex > 0) {
                    currentProofIndex--;
                    renderProof();
                }
            }
        }

        function stepImage(direction) {
            const proof = proofs[currentProofIndex];
            const attachments = (proof && proof.attachments) || [];
            if (attachments.length <= 1) return;
            currentImageIndex =
                (currentImageIndex + direction + attachments.length) % attachments.length;
            renderImage();
            if (lightboxOpen) openLightbox();
        }

        function showError(message) {
            loadingEl.style.display = 'none';
            errorEl.style.display = 'flex';
            errorMessageEl.textContent = message || 'Failed to load proofs';
        }

        function showEmpty() {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'flex';
        }

        function renderImage() {
            const proof = proofs[currentProofIndex];
            const attachments = (proof && proof.attachments) || [];
            let noImageMsg = imageWrapper.querySelector('.proofs-popup-no-image');

            if (attachments.length === 0) {
                imageEl.style.display = 'none';
                imageEl.removeAttribute('src');
                imageSpinner.style.display = 'none';
                if (!noImageMsg) {
                    noImageMsg = document.createElement('div');
                    noImageMsg.className = 'proofs-popup-no-image';
                    noImageMsg.style.cssText =
                        'color: var(--auto-trades-text-secondary, #bdbebe); font-size: 15px;';
                    noImageMsg.textContent = 'No image available';
                    imageWrapper.appendChild(noImageMsg);
                }
                noImageMsg.style.display = 'block';
                imagePrev.style.display = 'none';
                imageNext.style.display = 'none';
                imageCounter.style.display = 'none';
                return;
            }

            if (noImageMsg) {
                noImageMsg.style.display = 'none';
            }
            if (currentImageIndex >= attachments.length || currentImageIndex < 0) {
                currentImageIndex = 0;
            }

            const url = attachments[currentImageIndex];
            const id = ++imageLoadId;
            imageEl.style.display = 'none';
            imageEl.removeAttribute('src');
            imageSpinner.style.display = 'block';

            const loader = new Image();
            loader.onload = () => {
                if (id !== imageLoadId || isClosed) return;
                imageEl.src = url;
                imageEl.style.display = 'block';
                imageSpinner.style.display = 'none';
            };
            loader.onerror = () => {
                if (id !== imageLoadId || isClosed) return;
                imageSpinner.style.display = 'none';
            };
            loader.src = url;

            const multiple = attachments.length > 1;
            imagePrev.style.display = multiple ? 'block' : 'none';
            imageNext.style.display = multiple ? 'block' : 'none';
            imageCounter.style.display = multiple ? 'block' : 'none';
            if (multiple) {
                imageCounter.textContent = `${currentImageIndex + 1} / ${attachments.length}`;
            }
        }

        function renderMessage() {
            const proof = proofs[currentProofIndex];
            const text = proof && typeof proof.content === 'string' ? proof.content : '';
            messagePane.innerHTML = escapeText(text);
        }

        function renderPagination() {
            pageCurrentEl.textContent = String(currentProofIndex + 1);
            pageTotalEl.textContent = String(proofs.length);
            prevBtn.disabled = currentProofIndex <= 0;
            nextBtn.disabled = currentProofIndex >= proofs.length - 1;
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
            prevBtn.style.cursor = prevBtn.disabled ? 'not-allowed' : 'pointer';
            nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
        }

        function renderProof() {
            currentImageIndex = 0;
            renderImage();
            renderMessage();
            renderPagination();
        }

        function setTradesState(state) {
            tradesLoading.style.display = state === 'loading' ? 'flex' : 'none';
            tradesError.style.display = state === 'error' ? 'flex' : 'none';
            tradesEmpty.style.display = state === 'empty' ? 'flex' : 'none';
            tradesList.style.display = state === 'list' ? 'flex' : 'none';
        }

        function renderTradesList() {
            const payload = tradesCache[activeScope];
            if (tradesInFlight[activeScope]) {
                setTradesState('loading');
                return;
            }
            if (tradesErrors[activeScope]) {
                tradesErrorMessage.textContent = tradesErrors[activeScope];
                setTradesState('error');
                return;
            }
            if (!Array.isArray(payload)) {
                setTradesState('loading');
                return;
            }
            const filtered = showMoves
                ? payload
                : payload.filter((t) => String(t && t.kind).toLowerCase() !== 'move');
            if (filtered.length === 0) {
                setTradesState('empty');
                return;
            }
            tradesList.innerHTML = filtered.map(renderTrade).join('');
            setTradesState('list');
            fetchMissingAvatars(filtered);
        }

        function fetchTrades(scope) {
            const key = scope === 'ciid' ? ciid : itemId;
            if (!key) {
                tradesErrors[scope] = scope === 'ciid' ? 'No ciid available' : 'No item id available';
                if (scope === activeScope) renderTradesList();
                return;
            }
            if (tradesCache[scope] || tradesInFlight[scope]) {
                return;
            }
            tradesInFlight[scope] = true;
            if (scope === activeScope) setTradesState('loading');
            try {
                chrome.runtime.sendMessage(
                    {
                        action: 'fetchTradeHistory',
                        scope: scope,
                        key: String(key),
                    },
                    (response) => {
                        if (isClosed) return;
                        tradesInFlight[scope] = false;
                        if (chrome.runtime.lastError) {
                            tradesErrors[scope] = chrome.runtime.lastError.message;
                        } else if (!response || !response.success) {
                            tradesErrors[scope] =
                                (response && response.error) || 'Failed to load trade history';
                        } else {
                            const payload = response.data || {};
                            const list = Array.isArray(payload.data) ? payload.data : [];
                            tradesCache[scope] = list;
                        }
                        if (scope === activeScope) renderTradesList();
                    }
                );
            } catch (err) {
                tradesInFlight[scope] = false;
                tradesErrors[scope] = err && err.message ? err.message : 'Failed to load trade history';
                if (scope === activeScope) renderTradesList();
            }
        }

        function setScope(scope) {
            if (scope !== 'ciid' && scope !== 'item') return;
            if (scope === 'ciid' && !hasCiid) return;
            activeScope = scope;
            subtabButtons.forEach((btn) => {
                if (btn.getAttribute('data-scope') === scope) {
                    btn.classList.add('is-active');
                } else {
                    btn.classList.remove('is-active');
                }
            });
            if (!tradesCache[scope] && !tradesInFlight[scope] && !tradesErrors[scope]) {
                fetchTrades(scope);
            } else {
                renderTradesList();
            }
        }

        function setTrack(track) {
            if (track !== 'images' && track !== 'trades') return;
            activeTrack = track;
            trackButtons.forEach((btn) => {
                if (btn.getAttribute('data-track') === track) {
                    btn.classList.add('is-active');
                } else {
                    btn.classList.remove('is-active');
                }
            });
            trackImagesEl.style.display = track === 'images' ? 'flex' : 'none';
            trackTradesEl.style.display = track === 'trades' ? 'flex' : 'none';
            if (track === 'trades') {
                ensureRolimons(() => {
                    if (activeTrack === 'trades') renderTradesList();
                });
                setScope(activeScope);
            }
        }

        subtabButtons.forEach((btn) => {
            if (btn.getAttribute('data-scope') === activeScope) {
                btn.classList.add('is-active');
            }
        });

        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                close();
            }
        });
        document.addEventListener('keydown', handleKeyDown);

        trackButtons.forEach((btn) => {
            btn.addEventListener('click', () => setTrack(btn.getAttribute('data-track')));
        });
        subtabButtons.forEach((btn) => {
            btn.addEventListener('click', () => setScope(btn.getAttribute('data-scope')));
        });
        movesToggle.addEventListener('change', () => {
            showMoves = !!movesToggle.checked;
            renderTradesList();
        });

        prevBtn.addEventListener('click', () => {
            if (currentProofIndex > 0) {
                currentProofIndex--;
                renderProof();
            }
        });
        nextBtn.addEventListener('click', () => {
            if (currentProofIndex < proofs.length - 1) {
                currentProofIndex++;
                renderProof();
            }
        });
        imagePrev.addEventListener('click', (e) => {
            e.stopPropagation();
            stepImage(-1);
        });
        imageNext.addEventListener('click', (e) => {
            e.stopPropagation();
            stepImage(1);
        });
        imageEl.addEventListener('click', openLightbox);

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
        lightboxClose.addEventListener('click', closeLightbox);
        lightboxImage.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        const api = { close };
        activePopup = api;

        if (!itemId && !itemName) {
            showError('Missing item name or id');
            return api;
        }

        try {
            chrome.runtime.sendMessage(
                {
                    action: 'fetchProofs',
                    itemId: itemId || null,
                    itemName: itemName || null,
                },
                (response) => {
                    if (isClosed) return;
                    if (chrome.runtime.lastError) {
                        showError(chrome.runtime.lastError.message);
                        return;
                    }
                    if (!response || !response.success) {
                        showError((response && response.error) || 'Failed to fetch proofs');
                        return;
                    }
                    const data = response.data || {};
                    titleEl.textContent = buildTitle(data, itemId, itemName);
                    const results = Array.isArray(data.results) ? data.results : [];
                    countEl.textContent = `${results.length} proof${results.length !== 1 ? 's' : ''} found`;

                    loadingEl.style.display = 'none';

                    if (results.length === 0) {
                        showEmpty();
                        return;
                    }

                    proofs = results.slice().reverse();
                    currentProofIndex = 0;
                    contentEl.style.display = 'block';
                    footerEl.style.display = 'flex';
                    renderProof();
                }
            );
        } catch (err) {
            showError(err && err.message ? err.message : 'Failed to fetch proofs');
        }

        return api;
    }

    window.ProofsPopup = {
        show: show,
    };
})();
