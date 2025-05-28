import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Budget ID is required" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const result = await sql`
      DELETE FROM budget_categories 
      WHERE budget_id = ${id}
      RETURNING budget_id::text as id
    `;

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    return res.status(200).json({
      data: { id: result[0].id },
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
