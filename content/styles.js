(function() {
    'use strict';

    function injectStyles() {
        if (!document.getElementById('extension-trade-cards-css')) {
            const style = document.createElement('style');
            style.id = 'extension-trade-cards-css';
            style.textContent = `
                body:not(.path-auto-trades-send) #outbound-container,
                body:not(.path-auto-trades-send) #expired-container,
                body:not(.path-auto-trades-send) #countered-container,
                body:not(.path-auto-trades-send) #completed-container {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 16px !important;
                    margin: 0 auto !important;
                    max-width: 100% !important;
                }
                body:not(.path-auto-trades-send) .trade-card {
                    max-width: 100% !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }

                body.path-auto-trades-send .send-trades-container {
                    max-width: 1200px !important;
                    margin: 0 auto !important;
                    padding: 20px !important;
                }
                body.path-auto-trades-send .send-trades-grid {
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 16px !important;
                    margin: 0 auto !important;
                    width: 100% !important;
                }
                body.path-auto-trades-send .send-trade-card {
                    max-width: 100% !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }

                .pagination-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 20px auto 10px;
                    padding: 10px 15px;
                    max-width: 1200px;
                    background: var(--auto-trades-bg-secondary, #f5f5f5);
                    border: 1px solid var(--auto-trades-border, #e0e0e0);
                    border-radius: 8px;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .pagination-info {
                    font-size: 14px;
                    color: var(--auto-trades-text-secondary, #666666);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding-right: 12px;
                    border-right: 1px solid var(--auto-trades-border, #e0e0e0);
                    font-weight: 600;
                }

                .sorting-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-grow: 1;
                    justify-content: center;
                    padding: 0 12px;
                }

                .sort-btn {
                    background-color: var(--auto-trades-bg-primary, #ffffff);
                    border: 1px solid var(--auto-trades-border, #e0e0e0);
                    color: var(--auto-trades-text-primary, #191919);
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    outline: none;
                    transition: all 0.15s ease;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    white-space: nowrap;
                }

                .sort-btn:hover {
                    border-color: #00A2FF;
                    background-color: var(--auto-trades-bg-primary);
                }

                .sort-btn:active {
                    transform: scale(0.98);
                }

                body.dark-theme .sort-btn {
                    background-color: #232629;
                    border-color: #393b3d;
                    color: #e0e0e0;
                }

                body.dark-theme .sort-btn:hover {
                    border-color: #00A2FF;
                    background-color: #2a2d30;
                }

                .sort-select {
                    background-color: var(--auto-trades-bg-primary, #ffffff);
                    border: 1px solid var(--auto-trades-border, #e0e0e0);
                    color: var(--auto-trades-text-primary, #191919);
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    outline: none;
                    transition: all 0.15s ease;
                    min-width: 130px;
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                    background-size: 12px;
                    padding-right: 28px;
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .sort-select:hover {
                    border-color: #00A2FF;
                    background-color: var(--auto-trades-bg-primary);
                }

                .sort-select:focus {
                    border-color: var(--auto-trades-border, #e0e0e0);
                    border-bottom: 2px solid #00A2FF;
                    padding-bottom: 7px;
                    background-color: var(--auto-trades-bg-primary);
                }

                body:not(.dark-theme) .sort-select option {
                    background-color: #ffffff;
                    color: #191919;
                }

                body.dark-theme .sort-select {
                    background-color: #232629;
                    border-color: #393b3d;
                    color: #e0e0e0;
                    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23bdbebe%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
                }
                
                body.dark-theme .sort-select:hover {
                    border-color: #00A2FF;
                    background-color: #2a2d30;
                }

                body.dark-theme .sort-select option {
                    background-color: #232629;
                    color: #e0e0e0;
                }

                .pagination-buttons {
                    display: flex;
                    gap: 10px;
                    padding-left: 12px;
                    border-left: 1px solid var(--auto-trades-border, #e0e0e0);
                }

                .pagination-btn {
                    background: var(--auto-trades-bg-primary, #ffffff);
                    border: 1px solid var(--auto-trades-border, #e0e0e0);
                    color: var(--auto-trades-text-primary, #191919);
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    min-width: 100px;
                    text-align: center;
                }

                .pagination-btn:hover:not(:disabled) {
                    background: #00A2FF;
                    border-color: #00A2FF;
                    color: white;
                }

                .pagination-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    background: var(--auto-trades-bg-secondary, #f5f5f5);
                    border-color: var(--auto-trades-border);
                    transform: none;
                }

                @media (max-width: 850px) {
                    .pagination-controls {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 8px;
                    }
                    .pagination-info {
                        border-right: none;
                        border-bottom: 1px solid var(--auto-trades-border);
                        padding-bottom: 8px;
                        margin-bottom: 4px;
                        justify-content: center;
                    }
                    .sorting-controls {
                        flex-direction: row;
                        justify-content: center;
                        gap: 8px;
                        padding: 0;
                        margin-bottom: 4px;
                    }
                    .sort-select {
                        flex: 1;
                        min-width: 100px;
                    }
                    .pagination-buttons {
                        border-left: none;
                        padding-left: 0;
                        justify-content: center;
                    }
                    .pagination-btn {
                        flex: 1;
                    }
                }

                body:not(.path-auto-trades-send) .trade-values { flex-wrap: nowrap !important; gap: 16px !important; }
                body:not(.path-auto-trades-send) .value-section { min-width: 100px !important; font-size: 12px !important; }
                body:not(.path-auto-trades-send) .trade-timestamp { display: none !important; }
                body:not(.path-auto-trades-send) .trade-header { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
                body:not(.path-auto-trades-send) .trade-header-top { display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; }
                body:not(.path-auto-trades-send) .trade-timestamp-header { color: #666 !important; font-size: 10px !important; margin-top: 2px !important; }
            `;
            document.head.appendChild(style);
        }
    }

    window.ContentStyles = {
        injectStyles
    };

})();