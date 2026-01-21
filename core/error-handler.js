(function() {
    'use strict';

    const ERROR_TYPES = {
        EXPECTED: 'expected',
        UNEXPECTED: 'unexpected',
        NETWORK: 'network',
        VALIDATION: 'validation',
        PERMISSION: 'permission'
    };

    const ERROR_SEVERITY = {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
    };

    class ErrorHandler {
        constructor() {
            this.errors = [];
            this.maxErrors = 100;
            this.debugMode = false;
            this.listeners = new Set();
        }

        setDebugMode(enabled) {
            this.debugMode = enabled;
            if (enabled) {
                console.log('[ErrorHandler] Debug mode enabled');
            }
        }

        isDebugMode() {
            return this.debugMode;
        }

        handle(error, context = {}) {
            const errorInfo = this.normalizeError(error, context);
            
            this.errors.push(errorInfo);
            if (this.errors.length > this.maxErrors) {
                this.errors.shift();
            }

            if (this.debugMode) {
                this.logError(errorInfo);
            }

            this.notifyListeners(errorInfo);

            return errorInfo;
        }

        normalizeError(error, context) {
            const errorInfo = {
                id: this.generateErrorId(),
                timestamp: Date.now(),
                message: error?.message || String(error),
                stack: error?.stack,
                type: context.type || ERROR_TYPES.UNEXPECTED,
                severity: context.severity || ERROR_SEVERITY.MEDIUM,
                context: {
                    module: context.module || 'unknown',
                    action: context.action || 'unknown',
                    ...context
                },
                originalError: error
            };

            if (error?.name) {
                errorInfo.name = error.name;
            }

            if (error?.code) {
                errorInfo.code = error.code;
            }

            return errorInfo;
        }

        generateErrorId() {
            return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        logError(errorInfo) {
            const prefix = `[${errorInfo.type.toUpperCase()}]`;
            const message = `${prefix} ${errorInfo.context.module}.${errorInfo.context.action}: ${errorInfo.message}`;
            
            if (errorInfo.severity === ERROR_SEVERITY.CRITICAL || errorInfo.type === ERROR_TYPES.UNEXPECTED) {
                console.error(message, errorInfo);
            } else if (errorInfo.severity === ERROR_SEVERITY.HIGH) {
                console.warn(message, errorInfo.context);
            } else {
                console.log(message);
            }
        }

        subscribe(callback) {
            this.listeners.add(callback);
            return () => {
                this.listeners.delete(callback);
            };
        }

        notifyListeners(errorInfo) {
            this.listeners.forEach(callback => {
                try {
                    callback(errorInfo);
                } catch (error) {
                    console.error('Error in error handler listener:', error);
                }
            });
        }

        getErrors(filter = {}) {
            let filtered = [...this.errors];

            if (filter.type) {
                filtered = filtered.filter(e => e.type === filter.type);
            }

            if (filter.severity) {
                filtered = filtered.filter(e => e.severity === filter.severity);
            }

            if (filter.module) {
                filtered = filtered.filter(e => e.context.module === filter.module);
            }

            if (filter.since) {
                filtered = filtered.filter(e => e.timestamp >= filter.since);
            }

            return filtered;
        }

        clearErrors() {
            this.errors = [];
        }

        getErrorStats() {
            const stats = {
                total: this.errors.length,
                byType: {},
                bySeverity: {},
                byModule: {},
                recent: this.errors.filter(e => Date.now() - e.timestamp < 60000).length
            };

            this.errors.forEach(error => {
                stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
                stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
                stats.byModule[error.context.module] = (stats.byModule[error.context.module] || 0) + 1;
            });

            return stats;
        }
    }

    const errorHandler = new ErrorHandler();

    function handleError(error, context = {}) {
        return errorHandler.handle(error, context);
    }

    function handleExpectedError(error, context = {}) {
        return errorHandler.handle(error, { ...context, type: ERROR_TYPES.EXPECTED });
    }

    function handleUnexpectedError(error, context = {}) {
        return errorHandler.handle(error, { ...context, type: ERROR_TYPES.UNEXPECTED, severity: ERROR_SEVERITY.HIGH });
    }

    if (typeof window !== 'undefined') {
        window.ErrorHandler = errorHandler;
        window.handleError = handleError;
        window.handleExpectedError = handleExpectedError;
        window.handleUnexpectedError = handleUnexpectedError;
        window.ERROR_TYPES = ERROR_TYPES;
        window.ERROR_SEVERITY = ERROR_SEVERITY;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ErrorHandler: errorHandler, handleError, handleExpectedError, handleUnexpectedError, ERROR_TYPES, ERROR_SEVERITY };
    }

    if (typeof exports !== 'undefined') {
        Object.assign(exports, { ErrorHandler: errorHandler, handleError, handleExpectedError, handleUnexpectedError, ERROR_TYPES, ERROR_SEVERITY });
    }
})();
