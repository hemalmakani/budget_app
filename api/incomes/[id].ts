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
        id,
        source_name,
        amount,
        received_on,
        recurring,
        frequency,
        created_at
      FROM incomes 
      WHERE clerk_id = ${id}
      ORDER BY received_on DESC, created_at DESC
    `;

    return res.status(200).json({ data: response });
  } catch (error) {
    console.error("Error fetching incomes:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
