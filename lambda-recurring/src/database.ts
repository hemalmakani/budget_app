import { neon } from "@neondatabase/serverless";
import { Income, FixedCost, BudgetCategory, Transaction } from "./types";

export class RecurringDatabaseService {
  private sql: ReturnType<typeof neon>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    this.sql = neon(databaseUrl);
  }

  async getRecurringIncomes(): Promise<Income[]> {
    try {
      const result = await this.sql`
        SELECT 
          id,
          clerk_id,
          source_name,
          amount,
          received_on::text,
          recurring,
          frequency,
          created_at::text
        FROM incomes 
        WHERE recurring = true
        ORDER BY created_at ASC
      `;

      return result as Income[];
    } catch (error) {
      console.error("Error fetching recurring incomes:", error);
      throw new Error(`Failed to fetch recurring incomes: ${error}`);
    }
  }

  async getActiveFixedCosts(): Promise<FixedCost[]> {
    try {
      const currentDate = new Date().toISOString().split("T")[0];

      const result = await this.sql`
        SELECT 
          id,
          clerk_id,
          name,
          amount,
          frequency,
          start_date::text,
          end_date::text,
          category_id,
          created_at::text,
          updated_at::text
        FROM fixed_costs 
        WHERE (start_date IS NULL OR start_date <= ${currentDate})
        AND (end_date IS NULL OR end_date >= ${currentDate})
        ORDER BY created_at ASC
      `;

      return result as FixedCost[];
    } catch (error) {
      console.error("Error fetching active fixed costs:", error);
      throw new Error(`Failed to fetch active fixed costs: ${error}`);
    }
  }

  async getBudgetCategory(categoryId: number): Promise<BudgetCategory | null> {
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
        WHERE budget_id = ${categoryId}
      `;

      return (result as any[]).length > 0
        ? ((result as any[])[0] as BudgetCategory)
        : null;
    } catch (error) {
      console.error(`Error fetching budget category ${categoryId}:`, error);
      return null;
    }
  }

  async createIncomeTransaction(income: Income): Promise<Transaction> {
    try {
      const result = await this.sql`
        INSERT INTO transactions (
          name,
          category_id,
          amount,
          created_at,
          category_name,
          clerk_id,
          type
        ) VALUES (
          ${`Recurring: ${income.source_name}`},
          ${null}, -- Incomes don't have categories in your current schema
          ${income.amount},
          CURRENT_TIMESTAMP,
          ${income.source_name},
          ${income.clerk_id},
          ${"income"},
        )
        RETURNING 
          id::text,
          name,
          category_id::text,
          amount,
          created_at::text,
          category_name,
          clerk_id,
          type
      `;

      return (result as any[])[0] as Transaction;
    } catch (error) {
      console.error(
        `Error creating income transaction for ${income.id}:`,
        error
      );
      throw new Error(`Failed to create income transaction: ${error}`);
    }
  }

  async createFixedCostTransaction(
    fixedCost: FixedCost,
    categoryName?: string
  ): Promise<Transaction> {
    try {
      const result = await this.sql`
        INSERT INTO transactions (
          name,
          category_id,
          amount,
          created_at,
          category_name,
          clerk_id,
          type
        ) VALUES (
          ${`Fixed Cost: ${fixedCost.name}`},
          ${fixedCost.category_id},
          ${fixedCost.amount},
          CURRENT_TIMESTAMP,
          ${categoryName || "Fixed Cost"},
          ${fixedCost.clerk_id},
          ${"expense"}
        )
        RETURNING 
          id::text,
          name,
          category_id::text,
          amount,
          created_at::text,
          category_name,
          clerk_id,
          type
      `;

      return (result as any[])[0] as Transaction;
    } catch (error) {
      console.error(
        `Error creating fixed cost transaction for ${fixedCost.id}:`,
        error
      );
      throw new Error(`Failed to create fixed cost transaction: ${error}`);
    }
  }

  async updateBudgetBalance(categoryId: number, amount: number): Promise<void> {
    try {
      await this.sql`
        UPDATE budget_categories 
        SET balance = balance - ${amount}
        WHERE budget_id = ${categoryId}
      `;

      console.log(
        `Updated budget category ${categoryId} balance by -${amount}`
      );
    } catch (error) {
      console.error(`Error updating budget balance for ${categoryId}:`, error);
      throw new Error(`Failed to update budget balance: ${error}`);
    }
  }

  async updateIncomeLastProcessed(incomeId: number): Promise<void> {
    try {
      // Note: You might need to add a last_processed column to incomes table
      // For now, we'll update the received_on date to track processing
      await this.sql`
        UPDATE incomes 
        SET received_on = CURRENT_DATE
        WHERE id = ${incomeId}
      `;

      console.log(`Updated income ${incomeId} last processed date`);
    } catch (error) {
      console.error(`Error updating income last processed ${incomeId}:`, error);
      throw new Error(`Failed to update income last processed: ${error}`);
    }
  }

  async updateFixedCostLastProcessed(fixedCostId: number): Promise<void> {
    try {
      // Update the updated_at field to track when this fixed cost was last processed
      await this.sql`
        UPDATE fixed_costs 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ${fixedCostId}
      `;

      console.log(`Updated fixed cost ${fixedCostId} last processed date`);
    } catch (error) {
      console.error(
        `Error updating fixed cost last processed ${fixedCostId}:`,
        error
      );
      throw new Error(`Failed to update fixed cost last processed: ${error}`);
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
