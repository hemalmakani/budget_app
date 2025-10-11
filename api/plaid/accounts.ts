import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const sql = neon(`${process.env.DATABASE_URL}`);

const config = new Configuration({
  basePath:
    PlaidEnvironments[
      (process.env.PLAID_ENV || "sandbox") as keyof typeof PlaidEnvironments
    ],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
      "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
    },
  },
});

const plaid = new PlaidApi(config);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const { clerkId } = req.query;

      console.log("🔍 ACCOUNTS API - ClerkId received:", clerkId);

      if (!clerkId || typeof clerkId !== "string") {
        return res
          .status(400)
          .json({ error: "Missing required clerkId parameter" });
      }

      // First, let's check what accounts exist for this user
      console.log("🔍 CHECKING ALL ACCOUNTS for clerk_id:", clerkId);

      const allAccountsCheck = await sql`
        SELECT pa.id, pa.clerk_id, pa.name, pa.is_active, pi.institution_name
        FROM plaid_accounts pa
        LEFT JOIN plaid_items pi ON pa.item_id = pi.id
        WHERE pa.clerk_id = ${clerkId}
      `;

      console.log("🔍 FOUND ACCOUNTS (all):", allAccountsCheck.length);
      console.log(
        "🔍 ACCOUNT DETAILS:",
        JSON.stringify(allAccountsCheck, null, 2)
      );

      // Get user's accounts with associated items (using LEFT JOIN to include accounts even if items are missing)
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
          COALESCE(pi.institution_name, 'Unknown Bank') as institution_name,
          pi.access_token,
          pi.item_id as plaid_item_id
        FROM plaid_accounts pa
        LEFT JOIN plaid_items pi ON pa.item_id = pi.id
        WHERE pa.clerk_id = ${clerkId} AND pa.is_active = true
        ORDER BY pa.created_at DESC
      `;

      console.log("🔍 ACTIVE ACCOUNTS WITH ITEMS:", accountsResult.length);

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

      const response = {
        accounts,
        summary: {
          total_accounts: accounts.length,
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth,
        },
      };

      console.log("🔍 FINAL RESPONSE:", JSON.stringify(response, null, 2));

      return res.status(200).json(response);
    } catch (error: any) {
      console.error("Error fetching accounts:", error);
      return res.status(500).json({
        error: "Failed to fetch accounts",
        details: error?.message || "Unknown error",
      });
    }
  } else if (req.method === "POST") {
    try {
      const { clerkId } = req.body;

      if (!clerkId) {
        return res.status(400).json({ error: "Missing required clerkId" });
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
        WHERE pi.clerk_id = ${clerkId}
      `;

      let totalUpdated = 0;
      const errors = [];

      // Update balances for each account
      for (const item of itemsResult) {
        try {
          const balancesResponse = await plaid.accountsBalanceGet({
            access_token: item.access_token,
          });

          for (const account of balancesResponse.data.accounts) {
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

      return res.status(200).json({
        success: true,
        accounts_updated: totalUpdated,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Error syncing accounts:", error);

      return res.status(500).json({
        error: "Failed to sync accounts",
        details: error?.message || "Unknown error",
      });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

