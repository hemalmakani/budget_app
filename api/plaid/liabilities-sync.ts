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

    for (const item of items) {
      try {
        // Get liabilities from Plaid
        const response = await plaid.liabilitiesGet({
          access_token: item.access_token,
        });

        const liabilities = response.data.liabilities;
        const creditLiabilities = liabilities.credit || [];

        for (const credit of creditLiabilities) {
          if (!credit.account_id) continue;

          // Update the account with liability data
          await sql`
            UPDATE plaid_accounts SET
              next_payment_due_date = ${credit.next_payment_due_date ?? null},
              next_payment_amount = ${credit.minimum_payment_amount ?? null},
              last_payment_date = ${credit.last_payment_date ?? null},
              last_payment_amount = ${credit.last_payment_amount ?? null},
              updated_at = NOW()
            WHERE account_id = ${credit.account_id}
          `;
          
          totalAccountsUpdated++;
        }

        // We can also handle student loans or mortgages here if needed
        // but focusing on credit cards as per requirements.

      } catch (itemError: any) {
        // Log but continue processing other items
        // Liability data might not be available or authorized for all items
        const errorDetail = itemError?.response?.data || itemError?.message;
        console.warn(`Failed to get liabilities for item ${item.item_id}:`, JSON.stringify(errorDetail, null, 2));
      }
    }

    res.status(200).json({
      ok: true,
      accounts_updated: totalAccountsUpdated,
    });
  } catch (err: any) {
    console.error("Error syncing liabilities:", err);
    res.status(500).json({ error: err?.response?.data || err?.message });
  }
}
