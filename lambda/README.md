# Budget Reset Lambda Function

This AWS Lambda function automatically resets budget categories based on their schedule (weekly or monthly). It runs on a scheduled basis using Amazon EventBridge.

## Features

- 🔄 Automatically resets weekly and monthly budget categories
- 💾 Preserves savings budgets (never auto-resets)
- 📊 Detailed logging and execution summaries
- 🛡️ Error handling and rollback safety
- ⚡ Batch operations for optimal performance
- 🔍 Connection testing and health checks

## Architecture

```
EventBridge (Schedule) → Lambda Function → Neon Database
                                      ↓
                               CloudWatch Logs
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd lambda
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

This creates a `budget-reset-lambda.zip` file ready for upload to AWS.

### 4. AWS Console Setup

#### Create Lambda Function
1. Go to AWS Lambda Console
2. Click "Create function"
3. Choose "Author from scratch"
4. Function name: `budget-reset-scheduler`
5. Runtime: `Node.js 20.x`
6. Upload the `budget-reset-lambda.zip` file

#### Environment Variables
Set these in Configuration → Environment variables:
- `DATABASE_URL`: Your Neon database connection string
- `NODE_ENV`: `production`

#### EventBridge Trigger
1. Configuration → Triggers → Add trigger
2. Select "EventBridge (CloudWatch Events)"
3. Rule type: "Schedule expression"
4. Schedule: `cron(0 0 * * ? *)` (daily at midnight UTC)
5. For testing: `rate(5 minutes)`

#### Function Configuration
- Timeout: 30 seconds
- Memory: 128 MB
- Handler: `dist/index.handler`

## Schedule Expressions

### Production Schedules
- Daily check: `cron(0 0 * * ? *)`
- Twice daily: `cron(0 0,12 * * ? *)`
- Weekly (Sundays): `cron(0 0 ? * SUN *)`

### Testing Schedules
- Every 5 minutes: `rate(5 minutes)`
- Every hour: `rate(1 hour)`

## Reset Logic

### Weekly Budgets
- Reset every 7 days from `last_reset` timestamp
- Balance restored to full budget amount
- `last_reset` updated to current timestamp

### Monthly Budgets
- Reset when calendar month changes from `last_reset`
- Handles month boundaries correctly
- Works across year boundaries

### Savings Budgets
- Never automatically reset
- Balance accumulates over time
- Manual reset only

## Database Schema Requirements

Your `budget_categories` table must have:

```sql
budget_categories (
  budget_id SERIAL PRIMARY KEY,
  budget NUMERIC NOT NULL,
  balance NUMERIC NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('weekly', 'monthly', 'savings')),
  clerk_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Monitoring

### CloudWatch Logs
The function logs detailed information:
- Execution start/end times
- Database connection status
- Number of budgets processed
- Reset operations performed
- Error details

### Success Response
```json
{
  "statusCode": 200,
  "body": {
    "message": "Budget reset completed successfully",
    "summary": {
      "total_processed": 10,
      "weekly_resets": 3,
      "monthly_resets": 2,
      "skipped": 5,
      "errors": 0,
      "reset_details": [...],
      "execution_time_ms": 1250
    }
  }
}
```

### Error Response
```json
{
  "statusCode": 500,
  "body": {
    "message": "Budget reset failed",
    "error": "Database connection failed",
    "execution_time_ms": 500
  }
}
```

## Testing

### Local Testing
```bash
# Run the test handler locally
node -e "require('./dist/index').testHandler()"
```

### Manual Lambda Invocation
Use AWS CLI or console to manually trigger:
```bash
aws lambda invoke \
  --function-name budget-reset-scheduler \
  --payload '{}' \
  response.json
```

## Deployment Options

### 1. AWS Console (Manual)
- Upload zip file through console
- Good for initial setup and testing

### 2. AWS CLI
```bash
aws lambda update-function-code \
  --function-name budget-reset-scheduler \
  --zip-file fileb://budget-reset-lambda.zip
```

### 3. AWS SAM (Recommended for Production)
Create a `template.yaml` for infrastructure as code.

### 4. Serverless Framework
Use `serverless.yml` for easier deployment and management.

## Security Considerations

- Function has minimal IAM permissions
- Database credentials in environment variables
- VPC configuration if database requires it
- Enable AWS X-Ray for tracing (optional)

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Verify network connectivity (VPC settings)
   - Test database credentials

2. **No Budgets Reset**
   - Check `last_reset` timestamps in database
   - Verify budget types are 'weekly' or 'monthly'
   - Review Lambda logs for filtering logic

3. **Timeout Errors**
   - Increase Lambda timeout setting
   - Optimize batch operations
   - Check database performance

4. **Permission Errors**
   - Verify Lambda execution role
   - Check VPC security groups
   - Review database access permissions

### Debug Mode
Set `NODE_ENV=development` for verbose logging.

## Cost Considerations

- Lambda: ~$0.0000167 per request + compute time
- EventBridge: Free for first 1M events/month
- CloudWatch Logs: Minimal for log storage

Estimated monthly cost for daily execution: < $1

## Version History

- v1.0.0: Initial release with weekly/monthly reset logic
- Support for batch operations
- Comprehensive error handling and logging 