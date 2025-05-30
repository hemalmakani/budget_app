import { PlaidService, PlaidDataTransformer } from "../../lib/plaid";
import { sql } from "../../lib/db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { publicToken, clerkId } = req.body;

    if (!publicToken || !clerkId) {
      return res.status(400).json({
        error: "Missing required fields: publicToken, clerkId",
      });
    }

    // Verify user exists
    const userResult = await sql`
      SELECT user_id, clerk_id FROM users WHERE clerk_id = ${clerkId}
    `;

    if (!userResult.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult[0];

    // Exchange public token for access token
    const exchangeResponse =
      await PlaidService.exchangePublicToken(publicToken);
    const { access_token, item_id } = exchangeResponse;

    // Get item and institution information
    const itemResponse = await PlaidService.getItem(access_token);
    const institutionName = itemResponse.item.institution_id;

    // Store the Plaid item
    const itemResult = await sql`
      INSERT INTO plaid_items (user_id, access_token, item_id, institution_name, clerk_id, created_at)
      VALUES (${user.user_id}, ${access_token}, ${item_id}, ${institutionName}, ${clerkId}, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const storedItemId = itemResult[0].id;

    // Get accounts and store them
    const accountsResponse = await PlaidService.getAccounts(access_token);
    const storedAccounts = [];

    for (const plaidAccount of accountsResponse.accounts) {
      const transformedAccount = PlaidDataTransformer.transformAccount(
        plaidAccount,
        storedItemId,
        clerkId
      );

      const accountResult = await sql`
        INSERT INTO plaid_accounts (
          item_id, account_id, name, official_name, type, subtype, mask,
          current_balance, available_balance, credit_limit, user_id, clerk_id,
          last_balance_update, is_active, created_at
        )
        VALUES (
          ${transformedAccount.item_id}, ${transformedAccount.account_id}, 
          ${transformedAccount.name}, ${transformedAccount.official_name},
          ${transformedAccount.type}, ${transformedAccount.subtype}, 
          ${transformedAccount.mask}, ${transformedAccount.current_balance},
          ${transformedAccount.available_balance}, ${transformedAccount.credit_limit},
          ${user.user_id}, ${transformedAccount.clerk_id}, ${transformedAccount.last_balance_update},
          ${transformedAccount.is_active}, CURRENT_TIMESTAMP
        )
        RETURNING id, name, type, current_balance
      `;

      storedAccounts.push(accountResult[0]);
    }

    // Update sync status
    await sql`
      INSERT INTO plaid_sync_status (clerk_id, sync_status, transactions_synced_count)
      VALUES (${clerkId}, 'success', 0)
      ON CONFLICT (clerk_id) DO UPDATE SET
        last_sync_timestamp = CURRENT_TIMESTAMP,
        sync_status = 'success'
    `;

    return res.status(200).json({
      success: true,
      item_id: storedItemId,
      accounts: storedAccounts,
      message: "Bank successfully connected",
    });
  } catch (error: any) {
    console.error("Error exchanging public token:", error);

    // Log error in sync status
    try {
      const { clerkId } = req.body;
      if (clerkId) {
        await sql`
          INSERT INTO plaid_sync_status (clerk_id, sync_status, error_message)
          VALUES (${clerkId}, 'error', ${error?.message || "Unknown error"})
          ON CONFLICT (clerk_id) DO UPDATE SET
            last_sync_timestamp = CURRENT_TIMESTAMP,
            sync_status = 'error',
            error_message = ${error?.message || "Unknown error"}
        `;
      }
    } catch (logError) {
      console.error("Error logging sync status:", logError);
    }

    return res.status(500).json({
      error: "Failed to exchange public token",
      details: error?.message || "Unknown error",
    });
  }
}
