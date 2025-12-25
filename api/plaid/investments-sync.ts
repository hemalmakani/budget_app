import { VercelRequest, VercelResponse } from "@vercel/node";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get all Plaid items for the user
    const items = await sql`
      SELECT id, access_token, item_id 
      FROM plaid_items 
      WHERE clerk_id = ${clerkId}
    `;

    if (!items.length) {
      return res.status(404).json({ error: "No linked accounts found" });
    }

    let totalAccountsUpdated = 0;
    let totalHoldingsProcessed = 0;

    for (const item of items) {
      try {
        // Get investment holdings from Plaid
        const holdingsResponse = await plaid.investmentsHoldingsGet({
          access_token: item.access_token,
        });

        const accounts = holdingsResponse.data.accounts;
        const holdings = holdingsResponse.data.holdings;
        const securities = holdingsResponse.data.securities;

        // Create a map of security_id to security for quick lookup
        const securitiesMap = new Map(
          securities.map((s) => [s.security_id, s])
        );

        for (const account of accounts) {
          // Only process investment accounts
          if (account.type !== "investment") continue;

          // Get all holdings for this account
          const accountHoldings = holdings.filter(
            (h) => h.account_id === account.account_id
          );

          // Calculate total holdings value and cost basis
          let totalHoldingsValue = 0;
          let totalCostBasis = 0;

          for (const holding of accountHoldings) {
            totalHoldingsValue += holding.institution_value || 0;
            totalCostBasis += holding.cost_basis || 0;
          }

          const currentBalance = account.balances.current || 0;

          // Get yesterday's balance from history
          const yesterdayBalance = await sql`
            SELECT balance, holdings_value 
            FROM account_balance_history 
            WHERE account_id = (
              SELECT id FROM plaid_accounts WHERE account_id = ${account.account_id} LIMIT 1
            )
            AND recorded_at = CURRENT_DATE - INTERVAL '1 day'
            ORDER BY recorded_at DESC 
            LIMIT 1
          `;

          let previousCloseBalance = null;
          let dayChangeAmount = null;
          let dayChangePercent = null;

          if (yesterdayBalance.length > 0) {
            previousCloseBalance = yesterdayBalance[0].holdings_value || yesterdayBalance[0].balance;
            dayChangeAmount = totalHoldingsValue - previousCloseBalance;
            dayChangePercent = previousCloseBalance !== 0 
              ? (dayChangeAmount / previousCloseBalance) * 100 
              : 0;
          }

          // Update the account with investment data
          await sql`
            UPDATE plaid_accounts SET
              current_balance = ${currentBalance},
              available_balance = ${account.balances.available ?? null},
              holdings_value = ${totalHoldingsValue},
              cost_basis = ${totalCostBasis},
              previous_close_balance = ${previousCloseBalance},
              day_change_amount = ${dayChangeAmount},
              day_change_percent = ${dayChangePercent},
              last_balance_update = NOW(),
              updated_at = NOW()
            WHERE account_id = ${account.account_id}
          `;

          // Record today's balance in history (upsert)
          await sql`
            INSERT INTO account_balance_history (
              account_id, balance, available_balance, holdings_value, recorded_at
            )
            SELECT 
              id, 
              ${currentBalance}, 
              ${account.balances.available ?? null},
              ${totalHoldingsValue},
              CURRENT_DATE
            FROM plaid_accounts 
            WHERE account_id = ${account.account_id}
            ON CONFLICT (account_id, recorded_at) 
            DO UPDATE SET 
              balance = EXCLUDED.balance,
              available_balance = EXCLUDED.available_balance,
              holdings_value = EXCLUDED.holdings_value
          `;

          totalAccountsUpdated++;
          totalHoldingsProcessed += accountHoldings.length;
        }
      } catch (itemError: any) {
        // Log but continue processing other items
        // Investment data might not be available for all items
        const errorDetail = itemError?.response?.data || itemError?.message;
        console.warn(`Failed to get investments for item ${item.item_id}:`, JSON.stringify(errorDetail, null, 2));
      }
    }

    res.status(200).json({
      ok: true,
      accounts_updated: totalAccountsUpdated,
      holdings_processed: totalHoldingsProcessed,
    });
  } catch (err: any) {
    console.error("Error syncing investments:", err);
    res.status(500).json({ error: err?.response?.data || err?.message });
  }
}
