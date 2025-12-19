import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../../lib/auth-server";

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

    const sql = neon(`${process.env.DATABASE_URL}`);
    // 2. Use verified clerkId instead of query parameter
    const response = await sql`
      SELECT 
        id,
        name,
        category_id,
        amount,
        created_at,
        category_name
      FROM transactions 
      WHERE clerk_id = ${clerkId}
      ORDER BY created_at DESC
    `;

    return res.status(200).json({ data: response });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
