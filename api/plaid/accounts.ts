import { sql } from "../../lib/db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clerkId } = req.query;

    if (!clerkId || typeof clerkId !== "string") {
      return res.status(400).json({
        error: "Missing required clerkId parameter",
      });
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

    return res.status(200).json({
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
    return res.status(500).json({
      error: "Failed to fetch accounts",
      details: error?.message || "Unknown error",
    });
  }
}
