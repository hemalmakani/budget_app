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

    // Get user's active accounts with institution info
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
        COALESCE(pi.institution_name, 'Unknown Bank') as institution_name
      FROM plaid_accounts pa
      LEFT JOIN plaid_items pi ON pa.item_id = pi.id
      WHERE pa.clerk_id = ${clerkId} AND pa.is_active = true
      ORDER BY pa.created_at DESC
    `;

    // Calculate total net worth
    let totalAssets = 0;
    let totalLiabilities = 0;

    const accounts = accountsResult.map((account) => {
      const balance = parseFloat(account.current_balance || 0);

      // Credit cards and loans are liabilities
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
