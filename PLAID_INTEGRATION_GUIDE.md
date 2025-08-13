# Plaid Integration Guide for Budget App

## Overview

This guide explains how to use the enhanced Plaid integration in your budget app. The integration now includes:

- ✅ Bank account connection via Plaid Link
- ✅ Automatic transaction syncing
- ✅ Real-time webhook handling
- ✅ Account balance tracking
- ✅ Transaction categorization
- ✅ Sync status monitoring

## Prerequisites

1. Plaid developer account (https://dashboard.plaid.com/)
2. Vercel deployment for webhooks
3. Neon/PostgreSQL database with required tables

## Environment Variables

Add these environment variables to your Vercel project:

```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_secret_here
PLAID_ENV=sandbox  # sandbox, development, or production
PLAID_PRODUCTS=transactions,auth,identity
PLAID_COUNTRY_CODES=US,CA
PLAID_WEBHOOK_URL=https://your-domain.vercel.app/api/plaid/webhook

# Database (if not already set)
DATABASE_URL=your_neon_database_url
```

## Database Setup

1. Run the migration script to add required tables and columns:

```bash
# Execute the SQL migration script
psql $DATABASE_URL -f scripts/plaid-sync-status-migration.sql
```

This will create:
- `plaid_sync_status` table for tracking sync operations
- Additional columns in existing Plaid tables
- Indexes for better performance
- Triggers for timestamp updates

## API Endpoints

### 1. Create Link Token
**Endpoint:** `POST /api/plaid/create-link-token`

**Body:**
```json
{
  "clerkId": "user_clerk_id"
}
```

**Response:**
```json
{
  "link_token": "link-sandbox-...",
  "expiration": "2024-01-01T12:00:00Z"
}
```

### 2. Exchange Public Token
**Endpoint:** `POST /api/plaid/exchange-public-token`

**Body:**
```json
{
  "publicToken": "public-sandbox-...",
  "clerkId": "user_clerk_id"
}
```

**Response:**
```json
{
  "success": true,
  "item_id": 123,
  "accounts": [
    {
      "id": 1,
      "name": "Chase Checking",
      "type": "depository",
      "current_balance": 1500.00
    }
  ],
  "message": "Bank successfully connected"
}
```

### 3. Get Connected Accounts
**Endpoint:** `GET /api/plaid/accounts?clerkId=user_clerk_id`

**Response:**
```json
{
  "accounts": [
    {
      "id": 1,
      "name": "Chase Checking",
      "type": "depository",
      "current_balance": 1500.00,
      "available_balance": 1450.00,
      "institution_name": "Chase"
    }
  ],
  "summary": {
    "total_accounts": 1,
    "total_assets": 1500.00,
    "total_liabilities": 0.00,
    "net_worth": 1500.00
  }
}
```

### 4. Sync Transactions
**Endpoint:** `POST /api/plaid/sync-transactions`

**Body:**
```json
{
  "clerkId": "user_clerk_id",
  "startDate": "2024-01-01",  // optional
  "endDate": "2024-01-31"     // optional
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_transactions_processed": 50,
    "new_transactions_added": 15,
    "errors": 0,
    "error_details": []
  },
  "message": "Successfully synced 15 new transactions"
}
```

### 5. Webhook Handler
**Endpoint:** `POST /api/plaid/webhook`

This endpoint handles real-time updates from Plaid including:
- New transactions
- Account updates
- Item errors
- Authentication expiration

## React Components

### 1. PlaidLinkComponent

Connect bank accounts with a simple button:

```tsx
import { PlaidLinkComponent } from "@/components/PlaidLink";

<PlaidLinkComponent
  onSuccess={(accounts) => {
    console.log("Connected accounts:", accounts);
    // Handle successful connection
  }}
  onExit={() => {
    console.log("User exited Plaid Link");
  }}
  buttonText="Connect Bank Account"
  disabled={false}
/>
```

### 2. TransactionSync

Manually sync transactions:

```tsx
import { TransactionSync } from "@/components/TransactionSync";

<TransactionSync
  onSyncComplete={(summary) => {
    console.log("Sync completed:", summary);
    // Refresh your data
  }}
  autoSync={true}        // Enable automatic syncing
  syncInterval={30}      // Sync every 30 minutes
/>
```

### 3. AccountsOverview

Display connected accounts (you'll need to create this):

```tsx
import { AccountsOverview } from "@/components/AccountsOverview";

<AccountsOverview clerkId={user.id} />
```

## Usage in Dashboard

The dashboard now includes a Plaid section that:

1. **Checks for connected accounts** on load
2. **Shows connection button** if no accounts are connected
3. **Displays account overview** if accounts are connected
4. **Provides transaction sync controls**

## Error Handling

The integration includes comprehensive error handling:

### Common Errors

1. **ITEM_LOGIN_REQUIRED**: User needs to re-authenticate
2. **INSUFFICIENT_CREDENTIALS**: Invalid bank credentials
3. **INVALID_CREDENTIALS**: Wrong username/password
4. **INSTITUTION_ERROR**: Bank system temporarily down

### Error Recovery

```typescript
// Check sync status
const response = await fetch('/api/plaid/sync-status?clerkId=user_id');
const status = await response.json();

if (status.sync_status === 'error') {
  // Handle error - maybe show re-authentication prompt
  console.log('Sync error:', status.error_message);
}
```

## Data Flow

1. **User connects bank** → PlaidLink component → Exchange token → Store item/accounts
2. **Manual sync** → TransactionSync component → Fetch transactions → Store in database
3. **Automatic sync** → Webhook receives update → Process transactions → Update database
4. **Dashboard refresh** → Fetch latest data → Update UI

## Transaction Categorization

Plaid transactions are automatically mapped to your budget categories:

```typescript
// Category mapping examples:
"Food and Drink" → "Food"
"Transportation" → "Transportation"
"Shopping" → "Shopping"
"Entertainment" → "Entertainment"
// etc.
```

## Security Considerations

1. **Never store Plaid credentials** in your frontend
2. **Validate all webhook requests** (implement webhook verification)
3. **Use HTTPS** for all API endpoints
4. **Encrypt sensitive data** in your database
5. **Implement rate limiting** on API endpoints

## Testing

### Sandbox Mode

Use Plaid's sandbox environment for testing:

```bash
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your_sandbox_client_id
PLAID_SECRET=your_sandbox_secret
```

### Test Bank Credentials

In sandbox mode, use these test credentials:
- **Username:** `user_good`
- **Password:** `pass_good`

## Production Deployment

1. **Switch to production environment:**
   ```bash
   PLAID_ENV=production
   PLAID_CLIENT_ID=your_production_client_id
   PLAID_SECRET=your_production_secret
   ```

2. **Set up webhook URL** in Plaid dashboard
3. **Implement webhook verification**
4. **Set up monitoring** for sync failures
5. **Test with real bank accounts**

## Monitoring and Maintenance

### Sync Status Monitoring

```sql
-- Check sync status for all users
SELECT 
  clerk_id,
  sync_status,
  last_sync_timestamp,
  transactions_synced_count,
  error_message
FROM plaid_sync_status 
WHERE sync_status = 'error';
```

### Performance Optimization

1. **Batch process** large transaction sets
2. **Use pagination** for transaction fetching
3. **Implement caching** for account balances
4. **Clean up old** sync logs periodically

## Troubleshooting

### Common Issues

1. **"PlaidLink not found"** - Check React Native Plaid SDK version
2. **"Database connection failed"** - Verify DATABASE_URL
3. **"Webhook not receiving data"** - Check PLAID_WEBHOOK_URL
4. **"Transactions not syncing"** - Check API endpoint paths

### Debug Mode

Enable debug logging:

```typescript
// In your API handlers
console.log("Debug:", { clerkId, itemId, transactionCount });
```

## Support

For issues related to:
- **Plaid API**: Check Plaid documentation and dashboard
- **Database**: Verify connection and table structure
- **React Native**: Check expo/React Native compatibility
- **Integration**: Review this guide and check API responses

## Next Steps

1. **Run the database migration**
2. **Set up environment variables**
3. **Test with sandbox credentials**
4. **Connect your first bank account**
5. **Sync some transactions**
6. **Deploy to production**

The enhanced Plaid integration provides a solid foundation for automatic transaction management in your budget app! 