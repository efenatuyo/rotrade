(function() {
    'use strict';

    const Storage = window.ModuleRegistry?.getSafe('Storage') || window.Storage;

    class ProgressTracker {
        constructor() {
            this.tradeConfigGoals = new Map();
            this.tradeConfigSuccessCounts = new Map();
        }

        initializeGoals(opportunities) {
            opportunities.forEach(opp => {
                const tradeId = String(opp.id || '');
                if (!this.tradeConfigGoals.has(tradeId)) {
                    const autoTrades = Storage.getAccount('autoTrades', []);
                    const storedTrade = autoTrades.find(t => String(t.id) === tradeId);
                    const maxTrades = storedTrade?.settings?.maxTrades || storedTrade?.settings?.maxTradesPerDay || 5;
                    const currentCount = Trades.getTodayTradeCount(tradeId);
                    const goal = maxTrades - currentCount;
                    this.tradeConfigGoals.set(tradeId, Math.max(0, goal));
                    this.tradeConfigSuccessCounts.set(tradeId, 0);
                }
            });
        }

        recordSuccess(tradeId) {
            const currentSuccess = this.tradeConfigSuccessCounts.get(tradeId) || 0;
            this.tradeConfigSuccessCounts.set(tradeId, currentSuccess + 1);
        }

        getTotalSuccess() {
            return Array.from(this.tradeConfigSuccessCounts.values()).reduce((sum, count) => sum + count, 0);
        }

        getTotalGoal() {
            return Array.from(this.tradeConfigGoals.values()).reduce((sum, goal) => sum + goal, 0);
        }

        getGoal(tradeId) {
            return this.tradeConfigGoals.get(tradeId) || 0;
        }

        getSuccessCount(tradeId) {
            return this.tradeConfigSuccessCounts.get(tradeId) || 0;
        }

        hasAvailableOpportunity(opportunities, startIndex) {
            for (let i = startIndex; i < opportunities.length; i++) {
                const opp = opportunities[i];
                const tradeId = String(opp.id || '');
                const goal = this.getGoal(tradeId);
                const successCount = this.getSuccessCount(tradeId);

                if (goal > 0 && successCount < goal) {
                    return { opportunity: opp, index: i };
                }
            }
            return null;
        }

        allGoalsReached() {
            return Array.from(this.tradeConfigGoals.entries()).every(([tradeId, goal]) => {
                const successCount = this.getSuccessCount(tradeId);
                return goal <= 0 || successCount >= goal;
            });
        }

        getTradesNeedingMore() {
            return Array.from(this.tradeConfigGoals.entries()).filter(([tradeId, goal]) => {
                const successCount = this.getSuccessCount(tradeId);
                return goal > 0 && successCount < goal;
            });
        }

        getFilteredOpportunities(opportunities, isAllTrades) {
            if (isAllTrades) {
                return opportunities;
            }
            return opportunities.filter(opp => {
                const oppTradeId = String(opp.id || '');
                const goal = this.getGoal(oppTradeId);
                const successCount = this.getSuccessCount(oppTradeId);
                return goal > 0 && successCount < goal;
            });
        }
    }

    window.ProgressTracker = ProgressTracker;
})();
