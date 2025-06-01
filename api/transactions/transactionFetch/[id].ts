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
        t.id,
        t.name,
        t.category_id,
        t.amount,
        t.created_at,
        t.category_name,
        t.type,
        t.is_recurring,
        t.recurring_interval,
        bc.type as category_type
      FROM transactions t
      LEFT JOIN budget_categories bc ON t.category_id = bc.budget_id
      WHERE t.clerk_id = ${id}
      ORDER BY t.created_at DESC;
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
