import { PlaidService } from "../../lib/plaid";
import { sql } from "../../lib/db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      webhook_type,
      webhook_code,
      item_id,
      new_transactions,
      removed_transactions,
    } = req.body;

    console.log("Plaid webhook received:", {
      webhook_type,
      webhook_code,
      item_id,
    });

    // Verify webhook (you should implement proper verification)
    // const verification = await PlaidService.verifyWebhook(req.body, req.headers);

    switch (webhook_type) {
      case "TRANSACTIONS":
        await handleTransactionWebhook(
          webhook_code,
          item_id,
          new_transactions,
          removed_transactions
        );
        break;

      case "ITEM":
        await handleItemWebhook(webhook_code, item_id);
        break;

      case "ACCOUNTS":
        await handleAccountWebhook(webhook_code, item_id);
        break;

      default:
        console.log("Unhandled webhook type:", webhook_type);
    }

    return res.status(200).json({ status: "ok" });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

async function handleTransactionWebhook(
  webhookCode: string,
  itemId: string,
  newTransactions?: number,
  removedTransactions?: string[]
) {
  const itemResult = await sql`
    SELECT id, access_token, clerk_id FROM plaid_items WHERE item_id = ${itemId}
  `;

  if (!itemResult.length) {
    console.error("Item not found for webhook:", itemId);
    return;
  }

  const item = itemResult[0];

  switch (webhookCode) {
    case "INITIAL_UPDATE":
    case "HISTORICAL_UPDATE":
    case "DEFAULT_UPDATE":
      // Trigger a full sync for this item
      console.log(`Triggering sync for item ${itemId} due to ${webhookCode}`);
      // You could implement a background job here
      break;

    case "TRANSACTIONS_REMOVED":
      if (removedTransactions) {
        await sql`
          DELETE FROM plaid_transactions 
          WHERE transaction_id = ANY(${removedTransactions})
        `;
        console.log(`Removed ${removedTransactions.length} transactions`);
      }
      break;
  }
}

async function handleItemWebhook(webhookCode: string, itemId: string) {
  switch (webhookCode) {
    case "ERROR":
      // Handle item error
      await sql`
        UPDATE plaid_items 
        SET error = 'Item error occurred'
        WHERE item_id = ${itemId}
      `;
      break;

    case "PENDING_EXPIRATION":
      // Notify user to re-authenticate
      console.log("Item pending expiration:", itemId);
      break;

    case "USER_PERMISSION_REVOKED":
      // Handle user revoking access
      await sql`
        UPDATE plaid_items 
        SET access_token = NULL, error = 'User permission revoked'
        WHERE item_id = ${itemId}
      `;
      break;
  }
}

async function handleAccountWebhook(webhookCode: string, itemId: string) {
  switch (webhookCode) {
    case "ACCOUNT_UPDATED":
      // Refresh account balances
      console.log("Account updated, refreshing balances");
      break;
  }
}
