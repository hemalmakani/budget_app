import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

const sql = neon(`${process.env.DATABASE_URL}`);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, clerkId } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Account ID is required" });
    }

    if (!clerkId || typeof clerkId !== "string") {
      return res.status(400).json({ error: "clerkId is required" });
    }

    // Soft delete: set is_active = false
    // Also verify clerk_id matches
    const result = await sql`
      UPDATE plaid_accounts
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND clerk_id = ${clerkId}
      RETURNING id, name
    `;

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Account not found or unauthorized" });
    }

    return res.status(200).json({
      data: result[0],
      message: "Account unlinked successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

