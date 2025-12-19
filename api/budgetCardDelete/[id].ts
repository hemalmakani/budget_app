import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify JWT and get authenticated user
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Budget ID is required" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // 2. Delete budget AND verify ownership
    const result = await sql`
      DELETE FROM budget_categories 
      WHERE budget_id = ${id} AND clerk_id = ${clerkId}
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
