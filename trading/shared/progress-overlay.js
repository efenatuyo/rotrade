(function () {
    'use strict';
    const FADE_MS = 200;
    function closeWithFade(overlay, onRemoved) {
        if (!overlay) {
            if (onRemoved) {
                onRemoved();
            }
            return;
        }
        overlay.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(function () {
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
            if (onRemoved) {
                onRemoved();
            }
        }, FADE_MS);
    }
    function setBarFraction(barEl, completed, total) {
        if (!barEl) {
            return;
        }
        const pct = total > 0 ? (completed / total) * 100 : 0;
        barEl.style.width = pct + '%';
    }
    window.ProgressOverlay = {
        closeWithFade: closeWithFade,
        setBarFraction: setBarFraction,
    };
})();
