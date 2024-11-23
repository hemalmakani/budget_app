import { Budget } from "@/types/type";

/**
 * Calculates the number of days remaining in the current period (week or month)
 * based on the budget category type and creation date
 */
export const calculateRemainingDays = (budget: Budget): number => {
  const today = new Date();
  const createdDate = new Date(budget.created_at);

  if (budget.type === "weekly") {
    // Calculate the end of the current week based on creation date
    const endOfWeek = new Date(createdDate);
    endOfWeek.setDate(createdDate.getDate() + 7);

    // Keep adding 7 days until we find the relevant week
    while (endOfWeek < today) {
      endOfWeek.setDate(endOfWeek.getDate() + 7);
    }

    // Calculate remaining days
    const remainingDays = Math.ceil(
      (endOfWeek.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, remainingDays);
  } else if (budget.type === "monthly") {
    // Calculate the end of the current month based on creation date
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get the same day of month as creation date, but in current month
    const endOfMonth = new Date(
      currentYear,
      currentMonth,
      createdDate.getDate()
    );

    // If we've passed this day in the current month, move to next month
    if (today > endOfMonth) {
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    }

    // Calculate remaining days
    const remainingDays = Math.ceil(
      (endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, remainingDays);
  }

  return 0;
};

/**
 * Returns a formatted string describing the remaining time period
 */
export const formatRemainingTime = (budget: Budget): string => {
  const remainingDays = calculateRemainingDays(budget);

  if (remainingDays === 0) {
    return "Period ended";
  } else if (remainingDays === 1) {
    return "1 day remaining";
  } else {
    return `${remainingDays} days remaining`;
  }
};

/**
 * Returns the start and end dates of the current period
 */
export const getPeriodDates = (
  budget: Budget
): { startDate: Date; endDate: Date } => {
  const today = new Date();
  const createdDate = new Date(budget.created_at);

  if (budget.type === "weekly") {
    // Find the start of the current week period
    const startDate = new Date(createdDate);
    while (startDate < today) {
      startDate.setDate(startDate.getDate() + 7);
    }
    startDate.setDate(startDate.getDate() - 7);

    // End date is 7 days after start
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    return { startDate, endDate };
  } else if (budget.type === "monthly") {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Start date is the creation day in current month
    const startDate = new Date(
      currentYear,
      currentMonth,
      createdDate.getDate()
    );
    if (startDate > today) {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // End date is the same day next month
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    return { startDate, endDate };
  }

  return { startDate: new Date(), endDate: new Date() };
};
