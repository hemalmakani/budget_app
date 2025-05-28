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

export interface ResetResult {
  budget_id: string;
  category: string;
  type: string;
  previous_balance: number;
  new_balance: number;
  reset_time: string;
}

export interface LambdaResponse {
  statusCode: number;
  body: string;
}

export interface ResetSummary {
  total_processed: number;
  weekly_resets: number;
  monthly_resets: number;
  skipped: number;
  errors: number;
  reset_details: ResetResult[];
  execution_time_ms: number;
}
