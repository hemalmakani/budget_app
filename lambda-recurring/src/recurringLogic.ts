import * as types from "./types.js";

export class RecurringLogic {
  private static readonly MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
  private static readonly MILLISECONDS_IN_WEEK =
    7 * RecurringLogic.MILLISECONDS_IN_DAY;
  private static readonly MILLISECONDS_IN_BIWEEK =
    14 * RecurringLogic.MILLISECONDS_IN_DAY;

  /**
   * Determines if a recurring income should be processed based on its frequency and last processed date
   */
  static shouldProcessIncome(
    income: types.Income,
    currentTime: Date = new Date()
  ): boolean {
    const lastProcessedTime = new Date(income.received_on);
    const timeSinceLastProcessed =
      currentTime.getTime() - lastProcessedTime.getTime();

    switch (income.frequency) {
      case "weekly":
        return timeSinceLastProcessed >= RecurringLogic.MILLISECONDS_IN_WEEK;

      case "biweekly":
        return timeSinceLastProcessed >= RecurringLogic.MILLISECONDS_IN_BIWEEK;

      case "monthly":
        // For monthly items, check if we're in a different month
        const lastProcessedMonth = lastProcessedTime.getMonth();
        const lastProcessedYear = lastProcessedTime.getFullYear();
        const currentMonth = currentTime.getMonth();
        const currentYear = currentTime.getFullYear();

        return (
          currentYear > lastProcessedYear ||
          (currentYear === lastProcessedYear &&
            currentMonth > lastProcessedMonth)
        );

      default:
        console.warn(`Unknown income frequency: ${income.frequency}`);
        return false;
    }
  }

  /**
   * Determines if a fixed cost should be processed based on its frequency and dates
   */
  static shouldProcessFixedCost(
    fixedCost: types.FixedCost,
    currentTime: Date = new Date()
  ): boolean {
    // Check if fixed cost is within its active period
    if (!RecurringLogic.isFixedCostActive(fixedCost, currentTime)) {
      return false;
    }

    // Use updated_at as the reference date if it exists (last processed time)
    // If updated_at is null, this is the first time processing, so use start_date or created_at
    let referenceTime: Date;
    if (fixedCost.updated_at) {
      referenceTime = new Date(fixedCost.updated_at);
    } else if (fixedCost.start_date) {
      referenceTime = new Date(fixedCost.start_date);
    } else {
      referenceTime = new Date(fixedCost.created_at);
    }

    const timeSinceReference = currentTime.getTime() - referenceTime.getTime();

    switch (fixedCost.frequency) {
      case "weekly":
        return timeSinceReference >= RecurringLogic.MILLISECONDS_IN_WEEK;

      case "biweekly":
        return timeSinceReference >= RecurringLogic.MILLISECONDS_IN_BIWEEK;

      case "monthly":
        // For monthly items, check if we're in a different month
        const referenceMonth = referenceTime.getMonth();
        const referenceYear = referenceTime.getFullYear();
        const currentMonth = currentTime.getMonth();
        const currentYear = currentTime.getFullYear();

        return (
          currentYear > referenceYear ||
          (currentYear === referenceYear && currentMonth > referenceMonth)
        );

      default:
        console.warn(`Unknown fixed cost frequency: ${fixedCost.frequency}`);
        return false;
    }
  }

  /**
   * Checks if a fixed cost is currently active based on start and end dates
   */
  static isFixedCostActive(
    fixedCost: types.FixedCost,
    currentTime: Date = new Date()
  ): boolean {
    const currentDate = currentTime.toISOString().split("T")[0];

    // Check start date
    if (fixedCost.start_date && fixedCost.start_date > currentDate) {
      return false;
    }

    // Check end date
    if (fixedCost.end_date && fixedCost.end_date < currentDate) {
      return false;
    }

    return true;
  }

  /**
   * Filters incomes that need to be processed
   */
  static filterIncomesForProcessing(
    incomes: types.Income[],
    currentTime: Date = new Date()
  ): types.Income[] {
    return incomes.filter(
      (income) =>
        income.recurring &&
        RecurringLogic.shouldProcessIncome(income, currentTime)
    );
  }

  /**
   * Filters fixed costs that need to be processed
   */
  static filterFixedCostsForProcessing(
    fixedCosts: types.FixedCost[],
    currentTime: Date = new Date()
  ): types.FixedCost[] {
    return fixedCosts.filter((fixedCost) =>
      RecurringLogic.shouldProcessFixedCost(fixedCost, currentTime)
    );
  }

  /**
   * Creates a processed transaction record for logging
   */
  static createProcessedTransaction(
    item: types.Income | types.FixedCost,
    type: "income" | "fixed_cost",
    categoryName?: string,
    currentTime: Date = new Date()
  ): types.ProcessedTransaction {
    if (type === "income") {
      const income = item as types.Income;
      return {
        id: income.id,
        name: income.source_name,
        amount: income.amount,
        type: "income",
        frequency: income.frequency,
        user_id: income.clerk_id,
        processed_date: currentTime.toISOString(),
      };
    } else {
      const fixedCost = item as types.FixedCost;
      return {
        id: fixedCost.id,
        name: fixedCost.name,
        amount: fixedCost.amount,
        type: "fixed_cost",
        frequency: fixedCost.frequency,
        user_id: fixedCost.clerk_id,
        category_id: fixedCost.category_id || undefined,
        category_name: categoryName,
        processed_date: currentTime.toISOString(),
      };
    }
  }

  /**
   * Gets a human-readable description of the next processing time
   */
  static getNextProcessingDescription(
    item: types.Income | types.FixedCost
  ): string {
    const referenceDate =
      "received_on" in item
        ? new Date(item.received_on)
        : new Date(item.created_at);

    switch (item.frequency) {
      case "weekly":
        const nextWeekly = new Date(
          referenceDate.getTime() + RecurringLogic.MILLISECONDS_IN_WEEK
        );
        return `Next weekly processing: ${nextWeekly.toLocaleDateString()}`;

      case "biweekly":
        const nextBiweekly = new Date(
          referenceDate.getTime() + RecurringLogic.MILLISECONDS_IN_BIWEEK
        );
        return `Next biweekly processing: ${nextBiweekly.toLocaleDateString()}`;

      case "monthly":
        const nextMonth = new Date(referenceDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return `Next monthly processing: ${nextMonth.toLocaleDateString()}`;

      default:
        return "Unknown frequency";
    }
  }

  /**
   * Calculates how many days until the next processing for an item
   */
  static getDaysUntilNextProcessing(
    item: types.Income | types.FixedCost,
    currentTime: Date = new Date()
  ): number {
    const referenceDate =
      "received_on" in item
        ? new Date(item.received_on)
        : new Date(item.created_at);

    let nextProcessingDate: Date;

    switch (item.frequency) {
      case "weekly":
        nextProcessingDate = new Date(
          referenceDate.getTime() + RecurringLogic.MILLISECONDS_IN_WEEK
        );
        break;

      case "biweekly":
        nextProcessingDate = new Date(
          referenceDate.getTime() + RecurringLogic.MILLISECONDS_IN_BIWEEK
        );
        break;

      case "monthly":
        nextProcessingDate = new Date(referenceDate);
        nextProcessingDate.setMonth(nextProcessingDate.getMonth() + 1);
        break;

      default:
        return -1; // Unknown frequency
    }

    const timeDiff = nextProcessingDate.getTime() - currentTime.getTime();
    return Math.ceil(timeDiff / RecurringLogic.MILLISECONDS_IN_DAY);
  }
}
