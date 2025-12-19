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
    const result = await sql`
      SELECT 
        id::text, 
        clerk_id, 
        name, 
        amount, 
        frequency, 
        start_date::text, 
        end_date::text, 
        category_id::text,
        created_at::text,
        updated_at::text
      FROM fixed_costs
      WHERE clerk_id = ${clerkId}
      ORDER BY created_at DESC
    `;

    // Convert amount to number for each fixed cost
    const formattedResults = result.map((item) => {
      return {
        ...item,
        amount: Number(item.amount),
      };
    });

    return res.status(200).json({ data: formattedResults });
  } catch (error: any) {
    console.error("Error fetching fixed costs:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    return res.status(500).json({
      error: "Database Error",
      details: error?.detail || error?.message || "Unknown error",
    });
  }
}
