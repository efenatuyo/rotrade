(function() {
    'use strict';

    function validateData(data, schema) {
        if (!schema) return { valid: true, data };
        
        // Check if data is null or undefined
        if (data === null || data === undefined) {
            const requiredFields = Object.entries(schema)
                .filter(([_, validator]) => validator.required)
                .map(([key]) => key);
            return { 
                valid: false, 
                errors: requiredFields.map(key => `Missing required field: ${key}`),
                data: null 
            };
        }
        
        // Check if data is an object (not array, not primitive)
        if (typeof data !== 'object' || Array.isArray(data)) {
            return { 
                valid: false, 
                errors: ['Data must be an object'],
                data: null 
            };
        }
        
        const errors = [];
        const validated = {};
        
        for (const [key, validator] of Object.entries(schema)) {
            const value = data[key];
            
            if (validator.required && (value === undefined || value === null)) {
                errors.push(`Missing required field: ${key}`);
                continue;
            }
            
            if (value !== undefined && value !== null) {
                if (validator.type && typeof value !== validator.type) {
                    errors.push(`Invalid type for ${key}: expected ${validator.type}, got ${typeof value}`);
                    continue;
                }
                
                if (validator.validate && !validator.validate(value)) {
                    errors.push(`Validation failed for ${key}`);
                    continue;
                }
                
                validated[key] = value;
            } else if (validator.default !== undefined) {
                validated[key] = validator.default;
            }
        }
        
        if (errors.length > 0) {
            return { valid: false, errors, data: null };
        }
        
        return { valid: true, data: validated };
    }

    function ensureArray(value, fallback = []) {
        if (Array.isArray(value)) return value;
        return fallback;
    }

    function ensureNumber(value, fallback = 0) {
        const num = Number(value);
        if (!isNaN(num) && isFinite(num)) return num;
        return fallback;
    }

    function ensureString(value, fallback = '') {
        if (typeof value === 'string') return value.trim();
        if (value != null) return String(value).trim();
        return fallback;
    }

    const global = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
    
    if (global) {
        global.UtilsValidation = {
            validateData,
            ensureArray,
            ensureNumber,
            ensureString
        };
    }

})();