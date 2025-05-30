import { PlaidService } from "../../../lib/plaid";
import { sql } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json(
        { error: "Missing required clerkId parameter" },
        { status: 400 }
      );
    }

    // Get user's accounts with associated items
    const accountsResult = await sql`
      SELECT 
        pa.id,
        pa.account_id,
        pa.name,
        pa.official_name,
        pa.type,
        pa.subtype,
        pa.mask,
        pa.current_balance,
        pa.available_balance,
        pa.credit_limit,
        pa.last_balance_update,
        pa.is_active,
        pi.institution_name,
        pi.access_token,
        pi.item_id as plaid_item_id
      FROM plaid_accounts pa
      JOIN plaid_items pi ON pa.item_id = pi.id
      JOIN users u ON pa.user_id = u.user_id
      WHERE u.clerk_id = ${clerkId} AND pa.is_active = true
      ORDER BY pa.created_at DESC
    `;

    // Calculate total net worth
    let totalAssets = 0;
    let totalLiabilities = 0;

    const accounts = accountsResult.map((account) => {
      const balance = parseFloat(account.current_balance || 0);

      // Credit cards and loans are liabilities (negative balances are actually debt)
      if (account.type === "credit" || account.type === "loan") {
        totalLiabilities += Math.abs(balance);
      } else {
        totalAssets += balance;
      }

      return {
        id: account.id,
        account_id: account.account_id,
        name: account.name,
        official_name: account.official_name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        current_balance: balance,
        available_balance: parseFloat(account.available_balance || 0),
        credit_limit: parseFloat(account.credit_limit || 0),
        last_balance_update: account.last_balance_update,
        institution_name: account.institution_name,
        is_active: account.is_active,
      };
    });

    const netWorth = totalAssets - totalLiabilities;

    return Response.json({
      accounts,
      summary: {
        total_accounts: accounts.length,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: netWorth,
      },
    });
  } catch (error: any) {
    console.error("Error fetching accounts:", error);
    return Response.json(
      {
        error: "Failed to fetch accounts",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clerkId } = body;

    if (!clerkId) {
      return Response.json(
        { error: "Missing required clerkId" },
        { status: 400 }
      );
    }

    // Update sync status
    await sql`
      UPDATE plaid_sync_status 
      SET sync_status = 'in_progress', last_sync_timestamp = CURRENT_TIMESTAMP
      WHERE clerk_id = ${clerkId}
    `;

    // Get all user's Plaid items
    const itemsResult = await sql`
      SELECT pi.id, pi.access_token, pi.item_id
      FROM plaid_items pi
      JOIN users u ON pi.user_id = u.user_id
      WHERE u.clerk_id = ${clerkId}
    `;

    let totalUpdated = 0;
    const errors = [];

    // Update balances for each account
    for (const item of itemsResult) {
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
          totalUpdated++;
        }
      } catch (error: any) {
        console.error(`Error updating balances for item ${item.id}:`, error);
        errors.push({
          item_id: item.id,
          error: error?.message || "Unknown error",
        });
      }
    }

    // Update sync status
    const finalStatus = errors.length > 0 ? "error" : "success";
    const errorMessage = errors.length > 0 ? JSON.stringify(errors) : null;

    await sql`
      UPDATE plaid_sync_status 
      SET 
        sync_status = ${finalStatus},
        error_message = ${errorMessage},
        last_sync_timestamp = CURRENT_TIMESTAMP
      WHERE clerk_id = ${clerkId}
    `;

    return Response.json({
      success: true,
      accounts_updated: totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error syncing accounts:", error);

    // Update sync status with error
    try {
      const { clerkId } = await request.json();
      if (clerkId) {
        await sql`
          UPDATE plaid_sync_status 
          SET sync_status = 'error', error_message = ${error?.message || "Unknown error"}
          WHERE clerk_id = ${clerkId}
        `;
      }
    } catch (logError) {
      console.error("Error updating sync status:", logError);
    }

    return Response.json(
      {
        error: "Failed to sync accounts",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
