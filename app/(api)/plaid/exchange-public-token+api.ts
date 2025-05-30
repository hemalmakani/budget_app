import { PlaidService, PlaidDataTransformer } from "../../../lib/plaid";
import { sql } from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicToken, clerkId } = body;

    if (!publicToken || !clerkId) {
      return Response.json(
        { error: "Missing required fields: publicToken, clerkId" },
        { status: 400 }
      );
    }

    // Verify user exists
    const userResult = await sql`
      SELECT clerk_id FROM users WHERE clerk_id = ${clerkId}
    `;

    if (!userResult.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Exchange public token for access token
    const exchangeResponse =
      await PlaidService.exchangePublicToken(publicToken);
    const { access_token, item_id } = exchangeResponse;

    // Get item and institution information
    const itemResponse = await PlaidService.getItem(access_token);
    const institutionName = itemResponse.item.institution_id;

    // Store the Plaid item
    const itemResult = await sql`
      INSERT INTO plaid_items (access_token, item_id, institution_name, clerk_id, created_at)
      VALUES (${access_token}, ${item_id}, ${institutionName}, ${clerkId}, CURRENT_TIMESTAMP)
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
          current_balance, available_balance, credit_limit, clerk_id,
          last_balance_update, is_active, created_at
        )
        VALUES (
          ${transformedAccount.item_id}, ${transformedAccount.account_id}, 
          ${transformedAccount.name}, ${transformedAccount.official_name},
          ${transformedAccount.type}, ${transformedAccount.subtype}, 
          ${transformedAccount.mask}, ${transformedAccount.current_balance},
          ${transformedAccount.available_balance}, ${transformedAccount.credit_limit},
          ${transformedAccount.clerk_id}, ${transformedAccount.last_balance_update},
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

    return Response.json({
      success: true,
      item_id: storedItemId,
      accounts: storedAccounts,
      message: "Bank successfully connected",
    });
  } catch (error: any) {
    console.error("Error exchanging public token:", error);

    // Log error in sync status
    try {
      const { clerkId } = await request.json();
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

    return Response.json(
      {
        error: "Failed to exchange public token",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
