// Plaid Integration Type Definitions

export interface PlaidAccount {
  id: number;
  item_id?: number;
  account_id: string;
  name: string;
  official_name?: string;
  type: "depository" | "credit" | "loan" | "investment" | "other";
  subtype?: string;
  mask?: string;
  current_balance: number;
  available_balance?: number;
  credit_limit?: number;
  iso_currency_code?: string;
  user_id?: number;
  last_balance_update?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  institution_name?: string;
  // Investment tracking fields
  previous_close_balance?: number;
  day_change_amount?: number;
  day_change_percent?: number;
  cost_basis?: number;
  holdings_value?: number;
  // Liability fields
  next_payment_due_date?: string;
  next_payment_amount?: number;
  last_payment_date?: string;
  last_payment_amount?: number;
}

export interface PlaidTransaction {
  id: string; // UUID in database
  transaction_id: string;
  account_id: number;
  name: string;
  merchant_name?: string | null;
  amount: number;
  date: string;
  category?: string | null;
  subcategory?: string | null;
  plaid_category_id?: string | null;
  transaction_type?: string | null; // Plaid returns: 'place', 'online', 'special', 'unresolved'
  pending: boolean;
  iso_currency_code: string;
  location?: PlaidTransactionLocation | string | null; // Can be JSON string or object
  clerk_id: string; // Changed from user_id to match database schema
  is_synced_to_transactions: boolean;
  created_at: string;
  updated_at?: string | null;
  classified_category?: string; // Apple LLM classified category
  editable_category?: string; // User-edited category (overrides classified_category)
  editable_name?: string; // User-edited transaction name (overrides merchant_name/name)
}

export interface PlaidTransactionLocation {
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  lat?: number;
  lon?: number;
  store_number?: string;
}

export interface PlaidItem {
  id: number;
  user_id: number;
  access_token: string;
  item_id: string;
  institution_name: string;
  clerk_id: string;
  created_at: string;
}

export interface PlaidSyncStatus {
  id: number;
  clerk_id: string;
  last_sync_timestamp: string;
  sync_status: "success" | "error" | "in_progress";
  error_message?: string;
  transactions_synced_count: number;
  created_at: string;
  updated_at?: string;
}

export interface AccountsSummary {
  total_accounts: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

export interface AccountsResponse {
  accounts: PlaidAccount[];
  summary: AccountsSummary;
}

export interface TransactionsPagination {
  current_page: number;
  total_pages: number;
  total_transactions: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface TransactionsResponse {
  transactions: PlaidTransaction[];
  pagination: TransactionsPagination;
}

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface PlaidExchangeTokenResponse {
  success: boolean;
  item_id: number;
  accounts: PlaidAccount[];
  message: string;
}

export interface PlaidSyncResponse {
  success: boolean;
  transactions_synced?: number;
  accounts_updated?: number;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  errors?: {
    account_id?: number;
    item_id?: number;
    error: string;
  }[];
}

// API Request/Response Types
export interface CreateLinkTokenRequest {
  clerkId: string;
}

export interface ExchangePublicTokenRequest {
  publicToken: string;
  clerkId: string;
}

export interface SyncAccountsRequest {
  clerkId: string;
}

export interface SyncTransactionsRequest {
  clerkId: string;
  days?: number;
}

export interface GetAccountsParams {
  clerkId: string;
}

export interface GetTransactionsParams {
  clerkId: string;
  page?: number;
  limit?: number;
  accountId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

// Webhook Types
export interface PlaidWebhookRequest {
  webhook_type: "TRANSACTIONS" | "ITEM" | "ASSETS" | "INCOME" | "IDENTITY";
  webhook_code: string;
  item_id: string;
  error?: PlaidWebhookError;
  new_transactions?: number;
  removed_transactions?: string[];
}

export interface PlaidWebhookError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message?: string;
}

// Category Mapping Types
export interface CategoryMapping {
  plaid_category: string;
  plaid_subcategory?: string;
  local_category: string;
  confidence_score?: number;
}

export interface TransactionImportOptions {
  transaction_id: string;
  category_override?: string;
  should_import: boolean;
  notes?: string;
}

// Component Props Types
export interface PlaidLinkComponentProps {
  onSuccess?: (accounts: PlaidAccount[]) => void;
  onExit?: () => void;
  buttonText?: string;
  disabled?: boolean;
  style?: any;
}

export interface AccountsOverviewProps {
  onAccountSelect?: (account: PlaidAccount) => void;
  refreshInterval?: number;
}

export interface TransactionListProps {
  accountId?: string;
  onTransactionSelect?: (transaction: PlaidTransaction) => void;
  filters?: {
    category?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  };
}

// Error Types
export interface PlaidApiError {
  error: string;
  details?: string;
  code?: string;
}

export interface PlaidIntegrationError extends Error {
  code?: string;
  type?: "API_ERROR" | "NETWORK_ERROR" | "VALIDATION_ERROR" | "WEBHOOK_ERROR";
  details?: any;
}

// Utility Types
export type PlaidEnvironment = "sandbox" | "development" | "production";

export type PlaidProduct =
  | "transactions"
  | "auth"
  | "identity"
  | "assets"
  | "investments"
  | "liabilities"
  | "income";

export type PlaidCountryCode = "US" | "CA" | "GB" | "FR" | "ES" | "NL" | "IE";

export interface PlaidConfig {
  CLIENT_ID: string;
  SECRET: string;
  ENV: PlaidEnvironment;
  PRODUCTS: PlaidProduct[];
  COUNTRY_CODES: PlaidCountryCode[];
  WEBHOOK_URL: string;
}
