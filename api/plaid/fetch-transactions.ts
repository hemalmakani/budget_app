import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "User ID is required" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT 
        pt.id,
        pt.name,
        pt.amount,
        pt.date,
        pt.category,
        pt.subcategory,
        pt.transaction_type,
        pt.pending,
        pt.transaction_id,
        pt.merchant_name,
        pt.iso_currency_code,
        pt.location,
        pt.plaid_category_id,
        pt.is_synced_to_transactions,
        pt.created_at,
        pt.updated_at,
        pa.name as account_name,
        pa.type as account_type,
        pa.subtype as account_subtype,
        pa.mask as account_mask
      FROM plaid_transactions pt
      LEFT JOIN plaid_accounts pa ON pt.account_id = pa.id
      WHERE pt.clerk_id = ${id}
      ORDER BY pt.date DESC, pt.created_at DESC;
    `;

    return res.status(200).json({ data: response });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
