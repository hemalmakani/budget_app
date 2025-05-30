# Plaid Integration Setup Guide

This guide will walk you through setting up the complete Plaid banking integration for your budget app.

## Prerequisites

1. **Plaid Account**: Sign up at [Plaid Dashboard](https://dashboard.plaid.com)
2. **Database Access**: Ensure you have access to your Neon PostgreSQL database
3. **Environment Variables**: Access to configure environment variables

## Step 1: Database Schema Setup

Run the migration script to enhance your database:

```sql
-- Execute the SQL commands from scripts/plaid-migrations.sql
-- This will add new columns to existing tables and create the plaid_sync_status table
```

## Step 2: Environment Configuration

Add these environment variables to your deployment platform (Vercel, etc.):

```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret_key
PLAID_ENV=sandbox  # Change to 'production' for live
PLAID_PRODUCTS=transactions,auth,identity
PLAID_COUNTRY_CODES=US,CA
PLAID_WEBHOOK_URL=https://your-domain.com/api/plaid/webhook
```

### Getting Plaid Credentials:

1. Log into [Plaid Dashboard](https://dashboard.plaid.com)
2. Go to **Team Settings** → **Keys**
3. Copy your `client_id` and `secret` for sandbox/production
4. Configure your webhook URL in the dashboard

## Step 3: Webhook Configuration

In your Plaid Dashboard:

1. Go to **Team Settings** → **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/plaid/webhook`
3. Enable these webhook types:
   - `TRANSACTIONS` (all events)
   - `ITEM` (all events)
   - `ASSETS` (all events)

## Step 4: Frontend Integration

### Basic Usage Example:

```tsx
import React from 'react';
import { View } from 'react-native';
import { PlaidLinkComponent } from '../components/PlaidLink';
import { AccountsOverview } from '../components/AccountsOverview';

export default function BankingScreen() {
  const handleAccountsConnected = (accounts: any[]) => {
    console.log('Connected accounts:', accounts);
    // Refresh your accounts list or navigate to accounts view
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <PlaidLinkComponent 
        onSuccess={handleAccountsConnected}
        buttonText="Connect Your Bank"
      />
      
      <AccountsOverview />
    </View>
  );
}
```

## Step 5: API Endpoints Available

### 1. Create Link Token
```typescript
POST /api/plaid/create-link-token
Body: { clerkId: string }
Response: { link_token: string, expiration: string }
```

### 2. Exchange Public Token
```typescript
POST /api/plaid/exchange-public-token
Body: { publicToken: string, clerkId: string }
Response: { success: boolean, item_id: number, accounts: Account[] }
```

### 3. Get Accounts
```typescript
GET /api/plaid/accounts?clerkId=USER_ID
Response: { accounts: Account[], summary: AccountsSummary }
```

### 4. Sync Accounts (Manual Balance Update)
```typescript
POST /api/plaid/accounts
Body: { clerkId: string }
Response: { success: boolean, accounts_updated: number }
```

### 5. Get Transactions
```typescript
GET /api/plaid/transactions?clerkId=USER_ID&page=1&limit=50&accountId=123&category=Food&startDate=2024-01-01&endDate=2024-01-31
Response: { transactions: Transaction[], pagination: PaginationInfo }
```

### 6. Sync Transactions
```typescript
POST /api/plaid/transactions
Body: { clerkId: string, days?: number }
Response: { success: boolean, transactions_synced: number }
```

## Step 6: Component Integration

### Using PlaidLinkComponent

```tsx
import { PlaidLinkComponent } from '../components/PlaidLink';

<PlaidLinkComponent 
  onSuccess={(accounts) => {
    // Handle successful connection
    console.log('Connected accounts:', accounts);
  }}
  onExit={() => {
    // Handle user exit
    console.log('User exited Plaid Link');
  }}
  buttonText="Connect Bank Account"
  disabled={false}
/>
```

### Using AccountsOverview

```tsx
import { AccountsOverview } from '../components/AccountsOverview';

// Simply include in your screen
<AccountsOverview />
```

The component automatically:
- Fetches and displays connected accounts
- Shows net worth calculation
- Provides pull-to-refresh for balance updates
- Handles loading and error states

## Step 7: Data Flow Overview

1. **User connects bank** → PlaidLink → Exchange public token → Store in database
2. **Real-time updates** → Plaid webhooks → Update transactions/balances
3. **Manual sync** → User triggers → Fetch latest data from Plaid API
4. **Display data** → Components fetch from your API → Show to user

## Step 8: Testing

### Sandbox Testing

Plaid provides test credentials for sandbox mode:

**Test Bank Login:**
- Institution: Chase
- Username: `user_good`
- Password: `pass_good`

**Test Credit Card:**
- Institution: Wells Fargo
- Username: `user_good`  
- Password: `pass_good`

### Test the Flow:

1. Use PlaidLinkComponent with sandbox credentials
2. Connect test bank account
3. Verify accounts appear in AccountsOverview
4. Test transaction sync
5. Test webhook functionality

## Step 9: Production Deployment

### Before Going Live:

1. **Change Environment**: Update `PLAID_ENV` to `production`
2. **Production Credentials**: Use production `client_id` and `secret`
3. **Webhook Security**: Implement webhook signature verification
4. **Error Handling**: Ensure robust error handling for production scenarios
5. **Monitoring**: Set up logging and monitoring for Plaid API calls

### Production Checklist:

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Webhook URL configured in Plaid Dashboard
- [ ] Test with real bank account in sandbox
- [ ] Error handling implemented
- [ ] User permission flows tested
- [ ] Re-authentication flow tested

## Step 10: Security Considerations

1. **Access Token Encryption**: Consider encrypting access tokens in database
2. **Webhook Verification**: Implement Plaid webhook signature verification
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **User Permissions**: Ensure users can only access their own data
5. **Error Messages**: Don't expose sensitive error details to frontend

## Features Included

✅ **Complete Database Schema** - Enhanced Plaid tables with all required fields  
✅ **API Endpoints** - Full CRUD operations for accounts and transactions  
✅ **Real-time Webhooks** - Automatic updates from Plaid  
✅ **React Native Components** - Ready-to-use UI components  
✅ **Error Handling** - Comprehensive error handling and logging  
✅ **Data Transformation** - Automatic mapping between Plaid and local data  
✅ **Balance Tracking** - Real-time balance updates and net worth calculation  
✅ **Transaction Sync** - Automatic and manual transaction synchronization  
✅ **User Management** - Integration with Clerk authentication  

## Support and Troubleshooting

### Common Issues:

1. **Link Token Creation Fails**: Check Plaid credentials and user exists
2. **Webhook Not Receiving**: Verify webhook URL is accessible and configured
3. **Transactions Not Syncing**: Check account permissions and API quotas
4. **Balance Updates Failing**: Verify access tokens are still valid

### Debug Tips:

- Check server logs for detailed error messages
- Use Plaid Dashboard logs to trace API calls
- Verify database connectivity and schema
- Test with different institutions in sandbox

### Getting Help:

- [Plaid Documentation](https://plaid.com/docs/)
- [Plaid Community](https://plaid.com/community/)
- Check the `plaid_sync_status` table for error messages 