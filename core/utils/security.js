(function() {
    'use strict';

    /**
     * Sanitizes text to prevent XSS attacks when inserting into innerHTML
     * @param {string} text - The text to sanitize
     * @returns {string} - HTML-escaped text
     */
    function sanitizeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Sanitizes an attribute value to prevent XSS
     * @param {string} value - The attribute value to sanitize
     * @returns {string} - Escaped attribute value
     */
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

    /**
     * Validates and sanitizes a URL for use in href or src attributes
     * @param {string} url - The URL to validate
     * @param {string} allowedProtocols - Comma-separated list of allowed protocols (default: 'https:,http:,data:')
     * @returns {string|null} - Sanitized URL or null if invalid
     */
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

    /**
     * Sanitizes an object's string properties recursively
     * @param {object} obj - The object to sanitize
     * @param {string[]} keysToSanitize - Array of keys to sanitize (if empty, sanitizes all string values)
     * @returns {object} - New object with sanitized values
     */
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
