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
    const { item_id, clerkId } = req.body;

    if (!item_id && !clerkId) {
      return res.status(400).json({ error: "Provide item_id or clerkId" });
    }

    const items = item_id
      ? await sql`SELECT id, access_token, item_id, clerk_id FROM plaid_items WHERE item_id = ${item_id}`
      : await sql`SELECT id, access_token, item_id, clerk_id FROM plaid_items WHERE clerk_id = ${clerkId}`;

    if (!items.length) {
      return res.status(404).json({ error: "No items found" });
    }

    for (const it of items) {
      let cursor: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const resp = await plaid.transactionsSync({
          access_token: it.access_token,
          cursor,
        });
        const { added, has_more, next_cursor } = resp.data;
        cursor = next_cursor;
        hasMore = has_more;

        for (const t of added) {
          // Check if transaction already exists
          const existingTransactions = await sql`
            SELECT id FROM plaid_transactions WHERE transaction_id = ${t.transaction_id}
          `;

          if (existingTransactions.length > 0) {
            // Update existing transaction with all relevant fields
            await sql`
              UPDATE plaid_transactions SET
                name=${t.name ?? null},
                amount=${t.amount ?? null},
                date=${t.date ?? null},
                category=${(t.category && t.category[0]) ?? null},
                subcategory=${(t.category && t.category[1]) ?? null},
                transaction_type=${t.transaction_type ?? null},
                pending=${t.pending ?? false},
                merchant_name=${t.merchant_name ?? null},
                iso_currency_code=${t.iso_currency_code ?? "USD"},
                location=${t.location ? JSON.stringify(t.location) : null},
                plaid_category_id=${t.personal_finance_category?.primary ?? null},
                updated_at=NOW()
              WHERE transaction_id = ${t.transaction_id}
            `;
          } else {
            // Insert new transaction with all fields
            await sql`
              INSERT INTO plaid_transactions (
                account_id, transaction_id, name, merchant_name, amount, date,
                category, subcategory, plaid_category_id, transaction_type, pending,
                iso_currency_code, location, clerk_id, is_synced_to_transactions,
                created_at, updated_at
              )
              VALUES (
                (SELECT id FROM plaid_accounts WHERE account_id=${t.account_id} LIMIT 1),
                ${t.transaction_id ?? null},
                ${t.name ?? null},
                ${t.merchant_name ?? null},
                ${t.amount ?? null},
                ${t.date ?? null},
                ${(t.category && t.category[0]) ?? null},
                ${(t.category && t.category[1]) ?? null},
                ${t.personal_finance_category?.primary ?? null},
                ${t.transaction_type ?? null},
                ${t.pending ?? false},
                ${t.iso_currency_code ?? "USD"},
                ${t.location ? JSON.stringify(t.location) : null},
                ${it.clerk_id ?? null},
                false,
                NOW(),
                NOW()
              )
            `;
          }
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("Error syncing transactions:", err);
    res.status(500).json({ error: err?.response?.data || err?.message });
  }
}
