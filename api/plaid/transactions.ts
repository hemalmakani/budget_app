import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

const sql = neon(`${process.env.DATABASE_URL}`);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify JWT and get authenticated user
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("🔍 TRANSACTIONS API - Verified ClerkId:", clerkId);

    // Get user's transactions from plaid_transactions table (exclude already synced)
    // 2. Use verified clerkId instead of req.query.clerkId
    const transactionsResult = await sql`
      SELECT 
        pt.id,
        pt.transaction_id,
        pt.account_id,
        pt.name,
        pt.merchant_name,
        pt.amount,
        pt.date,
        pt.category,
        pt.subcategory,
        pt.plaid_category_id,
        pt.transaction_type,
        pt.pending,
        pt.iso_currency_code,
        pt.location,
        pt.is_synced_to_transactions,
        pt.created_at,
        pt.updated_at,
        pa.name as account_name,
        pa.type as account_type,
        pa.subtype as account_subtype,
        pa.mask as account_mask
      FROM plaid_transactions pt
      LEFT JOIN plaid_accounts pa ON pt.account_id = pa.id
      WHERE pt.clerk_id = ${clerkId}
      AND pt.is_synced_to_transactions = false
      ORDER BY pt.date DESC, pt.created_at DESC
      LIMIT 50
    `;

    console.log("🔍 FOUND TRANSACTIONS:", transactionsResult.length);

    const transactions = transactionsResult.map((transaction) => ({
      id: transaction.id,
      transaction_id: transaction.transaction_id,
      account_id: transaction.account_id,
      name: transaction.name,
      merchant_name: transaction.merchant_name,
      amount: parseFloat(transaction.amount || 0),
      date: transaction.date,
      category: transaction.category || "Other",
      subcategory: transaction.subcategory,
      plaid_category_id: transaction.plaid_category_id,
      transaction_type: transaction.transaction_type || "other",
      pending: transaction.pending || false,
      iso_currency_code: transaction.iso_currency_code || "USD",
      location: transaction.location,
      is_synced_to_transactions: transaction.is_synced_to_transactions,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      account_name: transaction.account_name,
      account_type: transaction.account_type,
      account_subtype: transaction.account_subtype,
      account_mask: transaction.account_mask,
    }));

    return res.status(200).json({
      transactions,
      total: transactions.length,
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      error: "Failed to fetch transactions",
      details: error?.message || "Unknown error",
    });
  }
}
