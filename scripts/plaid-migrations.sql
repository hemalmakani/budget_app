-- Plaid Integration Database Schema Enhancements
-- Execute these migrations in order

-- Task 1.1: Update plaid_accounts table
ALTER TABLE plaid_accounts 
ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_balance NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtype TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS official_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_balance_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NULL;

-- Add missing user_id relationship if not exists
ALTER TABLE plaid_accounts 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id);

-- Task 1.2: Enhance plaid_transactions table
ALTER TABLE plaid_transactions 
ADD COLUMN IF NOT EXISTS transaction_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS merchant_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS iso_currency_code TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_synced_to_transactions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS plaid_category_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NULL;

-- Task 1.3: Create plaid_sync_status table
CREATE TABLE IF NOT EXISTS plaid_sync_status (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  last_sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT DEFAULT NULL,
  transactions_synced_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_user_id ON plaid_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_is_active ON plaid_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_user_id ON plaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_transaction_id ON plaid_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON plaid_transactions(date);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_is_synced ON plaid_transactions(is_synced_to_transactions);
CREATE INDEX IF NOT EXISTS idx_plaid_sync_status_clerk_id ON plaid_sync_status(clerk_id);

-- Add constraints
ALTER TABLE plaid_sync_status 
ADD CONSTRAINT check_sync_status 
CHECK (sync_status IN ('success', 'error', 'in_progress'));

-- Add foreign key relationships if missing
ALTER TABLE plaid_items 
ADD COLUMN IF NOT EXISTS clerk_id TEXT REFERENCES users(clerk_id);

-- Update existing data to set user relationships (run this after setting up the relationships)
-- This will need to be run manually after ensuring data integrity

COMMENT ON TABLE plaid_accounts IS 'Enhanced Plaid accounts with balance tracking and user relationships';
COMMENT ON TABLE plaid_transactions IS 'Enhanced Plaid transactions with categorization and sync status';
COMMENT ON TABLE plaid_sync_status IS 'Tracks synchronization status between Plaid and local transactions'; 