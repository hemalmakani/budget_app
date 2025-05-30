import { PlaidService } from "../../../lib/plaid";
import { sql } from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhook_type, webhook_code, item_id, error } = body;

    console.log("Plaid webhook received:", {
      webhook_type,
      webhook_code,
      item_id,
      error,
    });

    // Get the item from our database
    const itemResult = await sql`
      SELECT id, access_token, user_id, clerk_id
      FROM plaid_items 
      WHERE item_id = ${item_id}
    `;

    if (!itemResult.length) {
      console.error("Item not found in database:", item_id);
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const item = itemResult[0];

    switch (webhook_type) {
      case "TRANSACTIONS":
        await handleTransactionsWebhook(webhook_code, item);
        break;

      case "ITEM":
        await handleItemWebhook(webhook_code, item, error);
        break;

      case "ASSETS":
        await handleAssetsWebhook(webhook_code, item);
        break;

      default:
        console.log(`Unhandled webhook type: ${webhook_type}`);
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return Response.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleTransactionsWebhook(webhookCode: string, item: any) {
  switch (webhookCode) {
    case "INITIAL_UPDATE":
    case "HISTORICAL_UPDATE":
    case "DEFAULT_UPDATE":
      // Trigger transaction sync
      try {
        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        const transactionsResponse = await PlaidService.getTransactions(
          item.access_token,
          startDate,
          endDate
        );

        // Get user's accounts for this item
        const accountsResult = await sql`
          SELECT id, account_id 
          FROM plaid_accounts 
          WHERE item_id = ${item.id}
        `;

        const accountMap = new Map();
        accountsResult.forEach((acc) => {
          accountMap.set(acc.account_id, acc.id);
        });

        let syncedCount = 0;

        for (const transaction of transactionsResponse.transactions) {
          const accountDbId = accountMap.get(transaction.account_id);
          if (!accountDbId) continue;

          // Check if transaction already exists
          const existingTransaction = await sql`
            SELECT id FROM plaid_transactions 
            WHERE transaction_id = ${transaction.transaction_id}
          `;

          if (existingTransaction.length === 0) {
            await sql`
              INSERT INTO plaid_transactions (
                transaction_id, account_id, name, merchant_name, amount, date,
                category, subcategory, plaid_category_id, transaction_type,
                pending, iso_currency_code, user_id, is_synced_to_transactions,
                created_at
              )
              VALUES (
                ${transaction.transaction_id}, ${accountDbId}, ${transaction.name},
                ${transaction.merchant_name}, ${transaction.amount}, ${transaction.date},
                ${transaction.category?.[0] || "Other"}, ${transaction.category?.[1]},
                ${transaction.category_id}, ${transaction.transaction_type},
                ${transaction.pending}, ${transaction.iso_currency_code || "USD"},
                ${item.user_id}, false, CURRENT_TIMESTAMP
              )
            `;
            syncedCount++;
          }
        }

        // Update sync status
        await sql`
          UPDATE plaid_sync_status 
          SET 
            sync_status = 'success',
            transactions_synced_count = transactions_synced_count + ${syncedCount},
            last_sync_timestamp = CURRENT_TIMESTAMP
          WHERE clerk_id = ${item.clerk_id}
        `;

        console.log(
          `Synced ${syncedCount} new transactions for item ${item.id}`
        );
      } catch (error) {
        console.error("Error syncing transactions from webhook:", error);

        // Update sync status with error
        await sql`
          UPDATE plaid_sync_status 
          SET sync_status = 'error', error_message = ${error?.message || "Webhook sync error"}
          WHERE clerk_id = ${item.clerk_id}
        `;
      }
      break;

    case "TRANSACTIONS_REMOVED":
      // Handle removed transactions
      console.log("Transactions removed webhook received");
      break;

    default:
      console.log(`Unhandled transactions webhook code: ${webhookCode}`);
  }
}

async function handleItemWebhook(webhookCode: string, item: any, error?: any) {
  switch (webhookCode) {
    case "ERROR":
      console.error("Item error webhook:", error);

      // Update sync status with error
      await sql`
        UPDATE plaid_sync_status 
        SET 
          sync_status = 'error',
          error_message = ${error?.error_message || "Item error"},
          last_sync_timestamp = CURRENT_TIMESTAMP
        WHERE clerk_id = ${item.clerk_id}
      `;

      // If it's a login required error, mark accounts as needing re-authentication
      if (error?.error_code === "ITEM_LOGIN_REQUIRED") {
        await sql`
          UPDATE plaid_accounts 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE item_id = ${item.id}
        `;
      }
      break;

    case "PENDING_EXPIRATION":
      console.log("Item pending expiration webhook");
      // Notify user about pending expiration
      break;

    case "USER_PERMISSION_REVOKED":
      console.log("User permission revoked webhook");

      // Deactivate all accounts for this item
      await sql`
        UPDATE plaid_accounts 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE item_id = ${item.id}
      `;
      break;

    default:
      console.log(`Unhandled item webhook code: ${webhookCode}`);
  }
}

async function handleAssetsWebhook(webhookCode: string, item: any) {
  switch (webhookCode) {
    case "PRODUCT_READY":
      console.log("Assets product ready webhook");
      // Trigger balance update
      try {
        const balancesResponse = await PlaidService.getAccountBalances(
          item.access_token
        );

        for (const account of balancesResponse.accounts) {
          await sql`
            UPDATE plaid_accounts 
            SET 
              current_balance = ${account.balances.current},
              available_balance = ${account.balances.available},
              credit_limit = ${account.balances.limit},
              last_balance_update = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE account_id = ${account.account_id} AND item_id = ${item.id}
          `;
        }
      } catch (error) {
        console.error("Error updating balances from webhook:", error);
      }
      break;

    default:
      console.log(`Unhandled assets webhook code: ${webhookCode}`);
  }
}
