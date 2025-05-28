import { BudgetCategory, ResetResult } from "./types";

export class BudgetResetLogic {
  private static readonly MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
  private static readonly MILLISECONDS_IN_WEEK =
    7 * BudgetResetLogic.MILLISECONDS_IN_DAY;

  /**
   * Determines if a budget category needs to be reset based on its type and last reset time
   */
  static shouldResetBudget(
    budget: BudgetCategory,
    currentTime: Date = new Date()
  ): boolean {
    const lastResetTime = new Date(budget.last_reset);
    const timeSinceLastReset = currentTime.getTime() - lastResetTime.getTime();

    switch (budget.type) {
      case "weekly":
        return timeSinceLastReset >= BudgetResetLogic.MILLISECONDS_IN_WEEK;

      case "monthly":
        // For monthly budgets, check if we're in a different month
        const lastResetMonth = lastResetTime.getMonth();
        const lastResetYear = lastResetTime.getFullYear();
        const currentMonth = currentTime.getMonth();
        const currentYear = currentTime.getFullYear();

        return (
          currentYear > lastResetYear ||
          (currentYear === lastResetYear && currentMonth > lastResetMonth)
        );

      case "savings":
        // Savings budgets are never automatically reset
        return false;

      default:
        console.warn(`Unknown budget type: ${budget.type}`);
        return false;
    }
  }

  /**
   * Calculates the new balance for a budget category after reset
   * For most budgets, this is simply the budget amount
   */
  static calculateNewBalance(budget: BudgetCategory): number {
    // Reset balance to the full budget amount
    return budget.budget;
  }

  /**
   * Processes a list of budget categories and returns those that need to be reset
   */
  static filterBudgetsForReset(
    budgets: BudgetCategory[],
    currentTime: Date = new Date()
  ): BudgetCategory[] {
    return budgets.filter((budget) =>
      BudgetResetLogic.shouldResetBudget(budget, currentTime)
    );
  }

  /**
   * Creates reset operations for budget categories that need to be reset
   */
  static createResetOperations(
    budgets: BudgetCategory[],
    currentTime: Date = new Date()
  ): { budgetId: string; newBalance: number }[] {
    const budgetsToReset = BudgetResetLogic.filterBudgetsForReset(
      budgets,
      currentTime
    );

    return budgetsToReset.map((budget) => ({
      budgetId: budget.budget_id,
      newBalance: BudgetResetLogic.calculateNewBalance(budget),
    }));
  }

  /**
   * Creates detailed reset results for logging and response
   */
  static createResetResults(
    budgets: BudgetCategory[],
    resetOperations: { budgetId: string; newBalance: number }[],
    currentTime: Date = new Date()
  ): ResetResult[] {
    const resetMap = new Map(
      resetOperations.map((op) => [op.budgetId, op.newBalance])
    );

    return budgets
      .filter((budget) => resetMap.has(budget.budget_id))
      .map((budget) => ({
        budget_id: budget.budget_id,
        category: budget.category,
        type: budget.type,
        previous_balance: budget.balance,
        new_balance: resetMap.get(budget.budget_id)!,
        reset_time: currentTime.toISOString(),
      }));
  }

  /**
   * Gets a human-readable description of the next reset time for a budget
   */
  static getNextResetDescription(budget: BudgetCategory): string {
    const lastReset = new Date(budget.last_reset);

    switch (budget.type) {
      case "weekly":
        const nextWeeklyReset = new Date(
          lastReset.getTime() + BudgetResetLogic.MILLISECONDS_IN_WEEK
        );
        return `Next weekly reset: ${nextWeeklyReset.toLocaleDateString()}`;

      case "monthly":
        const nextMonth = new Date(lastReset);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1); // First day of next month
        return `Next monthly reset: ${nextMonth.toLocaleDateString()}`;

      case "savings":
        return "Savings budgets are not automatically reset";

      default:
        return "Unknown budget type";
    }
  }
}
