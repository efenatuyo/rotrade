(function() {
    'use strict';

    const elementCache = new Map();
    const observer = new MutationObserver(() => elementCache.clear());

    observer.observe(document.body, { childList: true, subtree: true });

    function $(selector, parent = document) {
        const key = `${selector}:${parent === document ? 'doc' : parent.id || 'unknown'}`;
        if (elementCache.has(key)) {
            const cached = elementCache.get(key);
            if (cached && document.contains(cached)) {
                return cached;
            }
            elementCache.delete(key);
        }
        const el = parent.querySelector(selector);
        if (el) elementCache.set(key, el);
        return el;
    }

    function $$(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    }

    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'textContent') {
                el.textContent = value;
            } else if (key === 'innerHTML') {
                el.innerHTML = value;
            } else if (key.startsWith('data-')) {
                el.setAttribute(key, value);
            } else {
                el[key] = value;
            }
        });
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else {
                el.appendChild(child);
            }
        });
        return el;
    }

    function clearCache() {
        elementCache.clear();
    }

    window.DOM = { $, $$, createElement, clearCache };
})();
