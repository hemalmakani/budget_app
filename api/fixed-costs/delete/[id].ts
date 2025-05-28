import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Fixed cost ID is required" });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const result = await sql`
      DELETE FROM fixed_costs 
      WHERE id = ${id}
      RETURNING id::text
    `;

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Fixed cost not found" });
    }

    return res.status(200).json({
      data: { id: result[0].id },
      message: "Fixed cost deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting fixed cost:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
