import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify JWT and get authenticated user
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const { budget, category, type } = req.body;

    if (!budget || !category || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 2. Use verified clerkId instead of req.body.clerkId
    const response = await sql`
      INSERT INTO budget_categories (
        budget, 
        balance, 
        category, 
        clerk_id, 
        type
      ) 
      VALUES (
        ${budget}, 
        ${budget}, 
        ${category}, 
        ${clerkId}, 
        ${type}
      )
      RETURNING 
        budget_id::text as id,
        budget,
        balance,
        category,
        type,
        clerk_id,
        created_at,
        last_reset
    `;

    return res.status(201).json({ data: response[0] });
  } catch (error) {
    console.error("Error creating budget:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
