-- Migration script for Plaid sync status and enhanced transaction tracking
-- Run this script to add the missing tables and columns for Plaid integration

-- Create plaid_sync_status table to track sync operations
CREATE TABLE IF NOT EXISTS plaid_sync_status (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'success', 'error')),
  last_sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  transactions_synced_count INTEGER DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to plaid_transactions table if they don't exist
DO $$ 
BEGIN
  -- Add transaction_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'transaction_id') THEN
    ALTER TABLE plaid_transactions ADD COLUMN transaction_id TEXT UNIQUE;
  END IF;

  -- Add merchant_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'merchant_name') THEN
    ALTER TABLE plaid_transactions ADD COLUMN merchant_name TEXT;
  END IF;

  -- Add subcategory column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'subcategory') THEN
    ALTER TABLE plaid_transactions ADD COLUMN subcategory TEXT;
  END IF;

  -- Add plaid_category_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'plaid_category_id') THEN
    ALTER TABLE plaid_transactions ADD COLUMN plaid_category_id TEXT;
  END IF;

  -- Add iso_currency_code column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'iso_currency_code') THEN
    ALTER TABLE plaid_transactions ADD COLUMN iso_currency_code TEXT DEFAULT 'USD';
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'location') THEN
    ALTER TABLE plaid_transactions ADD COLUMN location JSONB;
  END IF;

  -- Add clerk_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'clerk_id') THEN
    ALTER TABLE plaid_transactions ADD COLUMN clerk_id TEXT;
  END IF;

  -- Add is_synced_to_transactions column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'is_synced_to_transactions') THEN
    ALTER TABLE plaid_transactions ADD COLUMN is_synced_to_transactions BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_transactions' AND column_name = 'created_at') THEN
    ALTER TABLE plaid_transactions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add missing columns to plaid_accounts table if they don't exist
DO $$ 
BEGIN
  -- Add official_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'official_name') THEN
    ALTER TABLE plaid_accounts ADD COLUMN official_name TEXT;
  END IF;

  -- Add subtype column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'subtype') THEN
    ALTER TABLE plaid_accounts ADD COLUMN subtype TEXT;
  END IF;

  -- Add current_balance column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'current_balance') THEN
    ALTER TABLE plaid_accounts ADD COLUMN current_balance NUMERIC(12,2);
  END IF;

  -- Add available_balance column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'available_balance') THEN
    ALTER TABLE plaid_accounts ADD COLUMN available_balance NUMERIC(12,2);
  END IF;

  -- Add credit_limit column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'credit_limit') THEN
    ALTER TABLE plaid_accounts ADD COLUMN credit_limit NUMERIC(12,2);
  END IF;

  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'user_id') THEN
    ALTER TABLE plaid_accounts ADD COLUMN user_id INTEGER REFERENCES users(user_id);
  END IF;

  -- Add clerk_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'clerk_id') THEN
    ALTER TABLE plaid_accounts ADD COLUMN clerk_id TEXT;
  END IF;

  -- Add last_balance_update column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'last_balance_update') THEN
    ALTER TABLE plaid_accounts ADD COLUMN last_balance_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'is_active') THEN
    ALTER TABLE plaid_accounts ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_accounts' AND column_name = 'created_at') THEN
    ALTER TABLE plaid_accounts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add missing columns to plaid_items table if they don't exist
DO $$ 
BEGIN
  -- Add error column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_items' AND column_name = 'error') THEN
    ALTER TABLE plaid_items ADD COLUMN error TEXT;
  END IF;

  -- Add clerk_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'plaid_items' AND column_name = 'clerk_id') THEN
    ALTER TABLE plaid_items ADD COLUMN clerk_id TEXT;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plaid_sync_status_clerk_id ON plaid_sync_status(clerk_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_clerk_id ON plaid_transactions(clerk_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_transaction_id ON plaid_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_id ON plaid_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON plaid_transactions(date);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_clerk_id ON plaid_accounts(clerk_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_user_id ON plaid_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_clerk_id ON plaid_items(clerk_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for plaid_sync_status table
DROP TRIGGER IF EXISTS update_plaid_sync_status_updated_at ON plaid_sync_status;
CREATE TRIGGER update_plaid_sync_status_updated_at 
    BEFORE UPDATE ON plaid_sync_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON plaid_sync_status TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON plaid_transactions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON plaid_accounts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON plaid_items TO your_app_user; 