(function () {
    'use strict';
    const modules = new Map();
    const loadingModules = new Set();
    const moduleDependencies = new Map();
    function registerModule(name, moduleFactory, dependencies = []) {
        if (modules.has(name)) {
        }
        moduleDependencies.set(name, dependencies);
        const module = {
            name: name,
            factory: moduleFactory,
            dependencies: dependencies,
            instance: null,
            isInitialized: false,
        };
        modules.set(name, module);
    }
    function getModule(name, fallback = undefined) {
        const module = modules.get(name);
        if (!module) {
            return fallback;
        }
        if (module.instance !== null) {
            return module.instance;
        }
        if (loadingModules.has(name)) {
            return fallback;
        }
        loadingModules.add(name);
        try {
            const dependencyInstances = module.dependencies.map((dep) => {
                if (typeof dep === 'string') {
                    const depInstance = getModule(dep);
                    if (depInstance === undefined && !modules.has(dep)) {
                        return fallback;
                    }
                    return depInstance;
                }
                return dep;
            });
            module.instance = module.factory(...dependencyInstances);
            module.isInitialized = true;
            return module.instance;
        } catch (e) {
            return fallback;
        } finally {
            loadingModules.delete(name);
        }
    }
    function isModuleRegistered(name) {
        return modules.has(name);
    }
    function getModuleDependencies(name) {
        return moduleDependencies.get(name) || [];
    }
    function clearModule(name) {
        const module = modules.get(name);
        if (module) {
            module.instance = null;
            module.isInitialized = false;
        }
    }
    function clearAllModules() {
        modules.forEach((module) => {
            module.instance = null;
            module.isInitialized = false;
        });
    }
    function getSafe(name, fallback = undefined) {
        if (!modules.has(name)) {
            return fallback;
        }
        try {
            return getModule(name, fallback);
        } catch {
            return fallback;
        }
    }
    function requireGlobals(names) {
        const missing = [];
        for (const name of names) {
            if (typeof window === 'undefined' || window[name] === undefined) {
                missing.push(name);
            }
        }
        if (missing.length && window.Utils?.Logger?.log) {
            window.Utils.Logger.log('module_registry_missing_globals', {
                missing: missing,
            });
        }
        return missing;
    }
    const ModuleRegistry = {
        register: registerModule,
        get: getModule,
        getSafe: getSafe,
        has: isModuleRegistered,
        getDependencies: getModuleDependencies,
        clear: clearModule,
        clearAll: clearAllModules,
        requireGlobals: requireGlobals,
    };
    if (typeof window !== 'undefined') {
        window.ModuleRegistry = ModuleRegistry;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ModuleRegistry;
    }
    if (typeof exports !== 'undefined') {
        Object.assign(exports, ModuleRegistry);
    }
})();
