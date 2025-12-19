import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verify JWT and get authenticated user
  const clerkId = await getAuthenticatedUserId(req);
  if (!clerkId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID is required" });
  }

  if (req.method === "GET") {
    try {
      const sql = neon(`${process.env.DATABASE_URL}`);

      // Use verified clerkId instead of query parameter
      const response = await sql`
        SELECT 
          goal_id::text as id,
          clerk_id,
          goal_name,
          goal_type,
          target_amount,
          target_percentage,
          current_amount,
          start_date::text,
          target_date::text,
          status,
          category_id::text,
          created_at::text,
          COALESCE(created_at::text) as updated_at
        FROM goals 
        WHERE clerk_id = ${clerkId}
        ORDER BY created_at DESC
      `;

      return res.status(200).json({ data: response });
    } catch (error) {
      console.error("Error fetching goals:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else if (req.method === "DELETE") {
    try {
      const sql = neon(`${process.env.DATABASE_URL}`);

      // 2. Delete goal AND verify ownership
      const result = await sql`
        DELETE FROM goals 
        WHERE goal_id = ${id} AND clerk_id = ${clerkId}
        RETURNING goal_id::text as id
      `;

      if (!result || result.length === 0) {
        return res.status(404).json({ error: "Goal not found" });
      }

      return res.status(200).json({ data: result[0] });
    } catch (error) {
      console.error("Error deleting goal:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
