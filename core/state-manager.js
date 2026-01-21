(function() {
    'use strict';

    class StateManager {
        constructor() {
            this.state = new Map();
            this.listeners = new Map();
            this.middleware = [];
        }

        set(key, value, options = {}) {
            const oldValue = this.state.get(key);
            this.state.set(key, value);

            if (!options.silent) {
                this.notify(key, value, oldValue);
            }

            return value;
        }

        get(key, defaultValue = undefined) {
            if (this.state.has(key)) {
                return this.state.get(key);
            }
            return defaultValue;
        }

        has(key) {
            return this.state.has(key);
        }

        delete(key, options = {}) {
            const oldValue = this.state.get(key);
            const deleted = this.state.delete(key);

            if (deleted && !options.silent) {
                this.notify(key, undefined, oldValue);
            }

            return deleted;
        }

        subscribe(key, callback) {
            if (!this.listeners.has(key)) {
                this.listeners.set(key, new Set());
            }
            this.listeners.get(key).add(callback);

            return () => {
                const callbacks = this.listeners.get(key);
                if (callbacks) {
                    callbacks.delete(callback);
                    if (callbacks.size === 0) {
                        this.listeners.delete(key);
                    }
                }
            };
        }

        notify(key, newValue, oldValue) {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                callbacks.forEach(callback => {
                    try {
                        callback(newValue, oldValue, key);
                    } catch (error) {
                        console.error(`Error in state listener for ${key}:`, error);
                    }
                });
            }
        }

        use(middleware) {
            this.middleware.push(middleware);
        }

        getAll() {
            return Object.fromEntries(this.state);
        }

        clear() {
            const keys = Array.from(this.state.keys());
            this.state.clear();
            keys.forEach(key => this.notify(key, undefined, this.state.get(key)));
        }

        reset(initialState = {}) {
            this.clear();
            Object.entries(initialState).forEach(([key, value]) => {
                this.set(key, value, { silent: true });
            });
        }
    }

    const stateManager = new StateManager();

    if (typeof window !== 'undefined') {
        window.StateManager = stateManager;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = stateManager;
    }

    if (typeof exports !== 'undefined') {
        Object.assign(exports, { StateManager: stateManager });
    }
})();
