export interface Income {
  id: number;
  clerk_id: string;
  source_name: string;
  amount: number;
  received_on: string;
  recurring: boolean;
  frequency: "weekly" | "biweekly" | "monthly";
  created_at: string;
  last_processed?: string;
}

export interface FixedCost {
  id: number;
  clerk_id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  start_date: string | null;
  end_date: string | null;
  category_id: number | null;
  created_at: string;
  updated_at: string | null;
  last_processed?: string;
}

export interface BudgetCategory {
  budget_id: string;
  budget: number;
  balance: number;
  category: string;
  type: "weekly" | "monthly" | "savings";
  clerk_id: string;
  created_at: string;
  last_reset: string;
}

export interface Transaction {
  id: string;
  name: string;
  category_id: string | null;
  amount: number;
  created_at: string;
  category_name: string;
  clerk_id: string;
  type: "income" | "expense";
}

export interface ProcessedTransaction {
  id: number;
  name: string;
  amount: number;
  type: "income" | "fixed_cost";
  frequency: string;
  user_id: string;
  category_id?: number;
  category_name?: string;
  processed_date: string;
}

export interface ProcessingSummary {
  total_incomes_processed: number;
  total_fixed_costs_processed: number;
  total_transactions_created: number;
  total_budget_updates: number;
  weekly_items: number;
  biweekly_items: number;
  monthly_items: number;
  errors: number;
  processed_details: ProcessedTransaction[];
  execution_time_ms: number;
}

export interface LambdaResponse {
  statusCode: number;
  body: string;
}
