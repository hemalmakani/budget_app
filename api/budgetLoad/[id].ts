import { neon } from "@neondatabase/serverless";
import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "User ID (Clerk) is required" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT
        budget, 
        balance, 
        category, 
        type, 
        created_at,
        budget_id::text as id
      FROM budget_categories 
      WHERE clerk_id = ${id}
    `;

    return res.status(200).json({ data: response });
  } catch (error) {
    console.error("Error fetching budget categories:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
