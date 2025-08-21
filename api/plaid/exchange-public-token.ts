import { VercelRequest, VercelResponse } from "@vercel/node";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { neon } from "@neondatabase/serverless";

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
    const { public_token, clerkId } = req.body;

    if (!public_token || !clerkId) {
      return res
        .status(400)
        .json({ error: "public_token and clerkId required" });
    }

    // 1. Exchange public token for access token
    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchange.data;

    // 2. Check if item already exists, then insert or update
    const existingItems = await sql`
      SELECT id, item_id FROM plaid_items WHERE item_id = ${item_id}
    `;

    let internalItemId;
    if (existingItems.length > 0) {
      // Update existing item
      const updateResult = await sql`
        UPDATE plaid_items 
        SET access_token = ${access_token}, clerk_id = ${clerkId}
        WHERE item_id = ${item_id}
        RETURNING id
      `;
      internalItemId = updateResult[0].id;
    } else {
      // Insert new item
      const insertResult = await sql`
        INSERT INTO plaid_items (user_id, access_token, item_id, institution_name, created_at, clerk_id)
        VALUES (NULL, ${access_token}, ${item_id}, NULL, NOW(), ${clerkId})
        RETURNING id
      `;
      internalItemId = insertResult[0].id;
    }

    // 3. Pull accounts and upsert into plaid_accounts
    const accountsResp = await plaid.accountsGet({ access_token });
    for (const a of accountsResp.data.accounts) {
      const b = a.balances || {};

      // Check if account already exists
      const existingAccounts = await sql`
        SELECT id FROM plaid_accounts WHERE account_id = ${a.account_id}
      `;

      if (existingAccounts.length > 0) {
        // Update existing account
        await sql`
          UPDATE plaid_accounts SET
            name=${a.name ?? null},
            type=${a.type ?? null},
            mask=${a.mask ?? null},
            current_balance=${b.current ?? 0},
            available_balance=${b.available ?? null},
            credit_limit=${b.limit ?? null},
            subtype=${a.subtype ?? null},
            official_name=${a.official_name ?? null},
            last_balance_update=NOW(),
            is_active=true,
            updated_at=NOW(),
            clerk_id=${clerkId}
          WHERE account_id = ${a.account_id}
        `;
      } else {
        // Insert new account
        await sql`
          INSERT INTO plaid_accounts (
            item_id, account_id, name, type, mask,
            current_balance, available_balance, credit_limit,
            subtype, official_name,
            last_balance_update, is_active, created_at, updated_at,
            clerk_id, user_id
          )
          VALUES (
            ${internalItemId}, ${a.account_id}, ${a.name ?? null}, ${a.type ?? null}, ${a.mask ?? null},
            ${b.current ?? 0}, ${b.available ?? null}, ${b.limit ?? null},
            ${a.subtype ?? null}, ${a.official_name ?? null},
            NOW(), true, NOW(), NOW(),
            ${clerkId}, NULL
          )
        `;
      }
    }

    return res.status(200).json({ item_id });
  } catch (err: any) {
    console.error("Error exchanging public token:", err);
    res.status(500).json({ error: err?.response?.data || err?.message });
  }
}
