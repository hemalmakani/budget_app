import { neon } from "@neondatabase/serverless";
import { BudgetCategory } from "./types";

export class DatabaseService {
  private sql: ReturnType<typeof neon>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    this.sql = neon(databaseUrl);
  }

  async getBudgetCategoriesForReset(): Promise<BudgetCategory[]> {
    try {
      const result = await this.sql`
        SELECT 
          budget_id::text,
          budget,
          balance,
          category,
          type,
          clerk_id,
          created_at::text,
          last_reset::text
        FROM budget_categories 
        WHERE type IN ('weekly', 'monthly')
        ORDER BY last_reset ASC
      `;

      return result as BudgetCategory[];
    } catch (error) {
      console.error("Error fetching budget categories:", error);
      throw new Error(`Failed to fetch budget categories: ${error}`);
    }
  }

  async resetBudgetCategory(
    budgetId: string,
    newBalance: number
  ): Promise<void> {
    try {
      const result = await this.sql`
        UPDATE budget_categories 
        SET 
          balance = ${newBalance},
          last_reset = CURRENT_TIMESTAMP
        WHERE budget_id = ${budgetId}
      `;

      console.log(
        `Reset budget category ${budgetId} to balance: ${newBalance}`
      );
    } catch (error) {
      console.error(`Error resetting budget category ${budgetId}:`, error);
      throw new Error(`Failed to reset budget category ${budgetId}: ${error}`);
    }
  }

  async resetMultipleBudgetCategories(
    resetOperations: { budgetId: string; newBalance: number }[]
  ): Promise<void> {
    if (resetOperations.length === 0) return;

    try {
      // Build a batch update query for better performance
      const updateQueries = resetOperations.map(
        ({ budgetId, newBalance }) =>
          this.sql`
          UPDATE budget_categories 
          SET 
            balance = ${newBalance},
            last_reset = CURRENT_TIMESTAMP
          WHERE budget_id = ${budgetId}
        `
      );

      await Promise.all(updateQueries);
      console.log(
        `Successfully reset ${resetOperations.length} budget categories`
      );
    } catch (error) {
      console.error("Error in batch reset operation:", error);
      throw new Error(`Failed to reset budget categories: ${error}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sql`SELECT 1 as test`;
      return true;
    } catch (error) {
      console.error("Database connection test failed:", error);
      return false;
    }
  }
}
