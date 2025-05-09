
# 📦 Budget App Database Schema (PostgreSQL)

This document describes the current database schema for the React Native budget tracking application, including changes discussed for scalability and future Plaid integration.

---

## 🧑 Users

Stores user account information.

```sql
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  clerk_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 💳 User Subscriptions

Tracks subscription status (free or premium).

```sql
CREATE TABLE user_subscriptions (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id),
  tier TEXT CHECK (tier IN ('free', 'premium')) NOT NULL DEFAULT 'free',
  active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

---

## 🗂 Budget Categories

User-defined budget categories: weekly, monthly, or savings.

```sql
CREATE TABLE budget_categories (
  budget_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('weekly', 'monthly', 'savings')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 💰 Transactions

Tracks all expenses, income, and transfers.

```sql
CREATE TABLE transactions (
  transaction_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  category_id INTEGER REFERENCES budget_categories(budget_id),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('expense', 'income', 'transfer')) DEFAULT 'expense',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT CHECK (recurring_interval IN ('weekly', 'monthly', 'biweekly'))
);
```

---

## 💵 Incomes

Tracks multiple income sources per user.

```sql
CREATE TABLE incomes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  source_name TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  received_on DATE NOT NULL,
  recurring BOOLEAN DEFAULT FALSE,
  frequency TEXT CHECK (frequency IN ('weekly', 'monthly', 'biweekly')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📆 Fixed Costs

Weekly or monthly recurring costs tied to categories.

```sql
CREATE TABLE fixed_costs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('weekly', 'monthly')),
  start_date DATE,
  end_date DATE,
  category_id INTEGER REFERENCES budget_categories(budget_id)
);
```

---

## 🎯 Savings Goals

Tracks user savings targets and deadlines.

```sql
CREATE TABLE goals (
  goal_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  category_id INTEGER REFERENCES budget_categories(budget_id),
  goal_type TEXT CHECK (goal_type IN ('PERCENTAGE', 'AMOUNT')),
  target_value NUMERIC NOT NULL,
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🏦 Plaid Integration Tables (For Future Use)

### Plaid Items

```sql
CREATE TABLE plaid_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  access_token TEXT,
  item_id TEXT,
  institution_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Plaid Accounts

```sql
CREATE TABLE plaid_accounts (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES plaid_items(id),
  account_id TEXT,
  name TEXT,
  type TEXT,
  mask TEXT
);
```

### Plaid Transactions

```sql
CREATE TABLE plaid_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id INTEGER REFERENCES plaid_accounts(id),
  name TEXT,
  amount NUMERIC(10,2),
  date DATE,
  category TEXT,
  transaction_type TEXT,
  pending BOOLEAN DEFAULT FALSE
);
```

---
