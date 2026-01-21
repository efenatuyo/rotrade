(function() {
    'use strict';

    function sanitizeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function sanitizeAttribute(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function sanitizeUrl(url, allowedProtocols = 'https:,http:,data:') {
        if (!url || typeof url !== 'string') {
            return null;
        }

        try {
            const urlObj = new URL(url, window.location.href);
            const protocol = urlObj.protocol.toLowerCase();
            const allowed = allowedProtocols.split(',').map(p => p.trim().toLowerCase() + ':');
            
            if (!allowed.includes(protocol)) {
                return null;
            }

            if (url.toLowerCase().trim().startsWith('javascript:')) {
                return null;
            }

            return urlObj.href;
        } catch (e) {
            return null;
        }
    }

    function sanitizeObject(obj, keysToSanitize = []) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (keysToSanitize.length === 0 || keysToSanitize.includes(key)) {
                if (typeof value === 'string') {
                    sanitized[key] = sanitizeHtml(value);
                } else if (typeof value === 'object' && value !== null) {
                    sanitized[key] = sanitizeObject(value, keysToSanitize);
                } else {
                    sanitized[key] = value;
                }
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    window.SecurityUtils = {
        sanitizeHtml,
        sanitizeAttribute,
        sanitizeUrl,
        sanitizeObject
    };

    if (!window.sanitizeHtml) {
        window.sanitizeHtml = sanitizeHtml;
    }

})();
