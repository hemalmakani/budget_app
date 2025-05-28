# Recurring Transactions Lambda Function

This AWS Lambda function automatically processes recurring incomes and fixed costs based on their frequency schedules (weekly, biweekly, monthly). It creates transactions and updates budget balances accordingly.

## Features

- 🔄 Processes recurring incomes (weekly, biweekly, monthly)
- 💸 Handles fixed costs with date-based activation
- 💰 Creates transaction records automatically
- 📊 Updates budget category balances for fixed costs
- 📈 Tracks last processed dates to avoid duplicates
- 🛡️ Comprehensive error handling and logging
- ⚡ Batch processing for optimal performance

## How It Works

### Recurring Incomes
- Checks all incomes where `recurring = true`
- Processes based on `frequency` and `received_on` date
- Creates income transactions
- Updates `received_on` to current date as processing tracker

### Fixed Costs
- Checks active fixed costs (within start/end date range)
- Processes based on `frequency` and `created_at` date
- Creates expense transactions
- Updates linked budget category balances
- Respects start_date and end_date constraints

## Setup Instructions

### 1. Install Dependencies

```bash
cd lambda-recurring
npm install
```

### 2. Build the Function

```bash
npm run build
```

### 3. Package for Deployment

```bash
npm run package
```

### 4. AWS Console Setup

#### Create Lambda Function
1. Function name: `recurring-transactions-processor`
2. Runtime: `Node.js 20.x`
3. Handler: `dist/index.handler`
4. Upload the `recurring-transactions-lambda.zip` file

#### Environment Variables
- `DATABASE_URL`: Your Neon database connection string
- `NODE_ENV`: `production`

#### EventBridge Trigger
**Recommended Schedule**: `cron(0 9 * * ? *)` (daily at 9 AM UTC)

**Why 9 AM UTC?**
- Gives users time to add/modify recurring items
- Processes before most business hours
- Avoid midnight timing conflicts with budget resets

## Frequency Logic

### Weekly
- Processes every 7 days from last processed date
- Example: Last processed Monday → Next Monday

### Biweekly  
- Processes every 14 days from last processed date
- Example: Last processed Jan 1 → Next Jan 15

### Monthly
- Processes when calendar month changes
- Example: Last processed January → Processes in February
- Handles month boundaries correctly

## Database Requirements

### Required Tables

**Incomes Table**:
```sql
-- Your existing incomes table works perfectly
CREATE TABLE incomes (
  id SERIAL PRIMARY KEY,
  clerk_id VARCHAR(50) NOT NULL,
  source_name TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  received_on DATE NOT NULL,
  recurring BOOLEAN DEFAULT FALSE,
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fixed Costs Table**:
```sql
-- Your existing fixed_costs table works perfectly
CREATE TABLE fixed_costs (
  id SERIAL PRIMARY KEY,
  clerk_id VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  start_date DATE,
  end_date DATE,
  category_id INTEGER REFERENCES budget_categories(budget_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Processing Examples

### Example 1: Weekly Salary
```
Income: "Salary" - $2000 weekly
Last processed: Jan 1, 2024
Current date: Jan 8, 2024
Result: ✅ Creates transaction, updates received_on to Jan 8
```

### Example 2: Monthly Rent
```
Fixed Cost: "Rent" - $1200 monthly, linked to "Housing" budget
Last processed: Dec 15, 2023
Current date: Jan 5, 2024
Result: ✅ Creates transaction, reduces "Housing" budget by $1200
```

### Example 3: Inactive Fixed Cost
```
Fixed Cost: "Gym Membership" - $50 monthly
Start date: Feb 1, 2024
End date: Dec 31, 2024
Current date: Jan 15, 2024
Result: ❌ Skipped (not yet active)
```

## Monitoring

### Success Response
```json
{
  "statusCode": 200,
  "body": {
    "message": "Recurring transactions processed successfully",
    "summary": {
      "total_incomes_processed": 5,
      "total_fixed_costs_processed": 8,
      "total_transactions_created": 13,
      "total_budget_updates": 6,
      "weekly_items": 3,
      "biweekly_items": 2,
      "monthly_items": 8,
      "errors": 0,
      "processed_details": [...],
      "execution_time_ms": 2150
    }
  }
}
```

### CloudWatch Logs
- Detailed processing logs for each item
- Error tracking with specific item IDs
- Performance metrics

## Testing

### Test Event JSON
```json
{
  "source": "aws.events",
  "detail-type": "Scheduled Event", 
  "detail": {}
}
```

### Manual Database Testing

**Create test recurring income**:
```sql
INSERT INTO incomes (clerk_id, source_name, amount, received_on, recurring, frequency)
VALUES ('test_user_123', 'Test Salary', 1000.00, '2024-01-01', true, 'weekly');
```

**Create test fixed cost**:
```sql
INSERT INTO fixed_costs (clerk_id, name, amount, frequency, start_date, category_id)
VALUES ('test_user_123', 'Test Rent', 800.00, 'monthly', '2024-01-01', 1);
```

## Integration with Budget Reset

This function works alongside your budget reset Lambda:

1. **Budget Reset Lambda**: Runs at midnight, resets budget balances
2. **Recurring Transactions Lambda**: Runs at 9 AM, processes recurring items

**Recommended Schedule Coordination**:
- Budget Reset: `cron(0 0 * * ? *)` (midnight UTC)
- Recurring Transactions: `cron(0 9 * * ? *)` (9 AM UTC)

## Cost Estimation

**Daily execution cost**: ~$0.0001
**Monthly cost**: < $1
**Very cost-effective for automated financial processing**

## Deployment

1. **Build and package**: `npm run deploy`
2. **Upload to AWS**: Upload `recurring-transactions-lambda.zip`
3. **Configure handler**: `dist/index.handler`
4. **Set environment variables**: `DATABASE_URL`
5. **Create EventBridge trigger**: `cron(0 9 * * ? *)`

## Future Enhancements

1. **Add last_processed columns** to both tables for better tracking
2. **Email notifications** for processed transactions
3. **Flexible scheduling** per user/item
4. **Retry logic** for failed transactions
5. **Integration with Plaid** for automatic income detection

Your recurring financial automation is now complete! 🚀 