import { PLAID_CONFIG } from "../../lib/config";
import { neon } from "@neondatabase/serverless";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const sql = neon(`${process.env.DATABASE_URL}`);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clerkId } = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: "clerkId required" });
    }

    // Check database contents
    const accounts = await sql`
      SELECT id, name, clerk_id, current_balance, is_active, item_id, created_at
      FROM plaid_accounts 
      WHERE clerk_id = ${clerkId}
    `;

    const items = await sql`
      SELECT id, item_id, institution_name, clerk_id, created_at
      FROM plaid_items
      WHERE clerk_id = ${clerkId}
    `;

    const transactions = await sql`
      SELECT id, name, amount, clerk_id, created_at
      FROM plaid_transactions
      WHERE clerk_id = ${clerkId}
      LIMIT 5
    `;

    // Quick fix: Update existing items with missing institution names
    const itemsToFix = items.filter((item) => !item.institution_name);
    let fixedItems = 0;

    for (const item of itemsToFix) {
      try {
        await sql`
          UPDATE plaid_items 
          SET institution_name = 'Wells Fargo Bank'
          WHERE id = ${item.id} AND institution_name IS NULL
        `;
        fixedItems++;
      } catch (error) {
        console.error(`Failed to fix item ${item.id}:`, error);
      }
    }

    return res.status(200).json({
      status: "Debug endpoint working",
      clerkId,
      config: {
        hasClientId: !!PLAID_CONFIG.CLIENT_ID,
        hasSecret: !!PLAID_CONFIG.SECRET,
        environment: PLAID_CONFIG.ENV,
        clientIdLength: PLAID_CONFIG.CLIENT_ID?.length || 0,
        secretLength: PLAID_CONFIG.SECRET?.length || 0,
      },
      counts: {
        accounts: accounts.length,
        items: items.length,
        transactions: transactions.length,
      },
      data: {
        accounts,
        items,
        transactions,
      },
      fixes: {
        itemsFixed: fixedItems,
        message: `Updated ${fixedItems} items with missing institution names`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Debug endpoint failed",
      details: error?.message || "Unknown error",
    });
  }
}
