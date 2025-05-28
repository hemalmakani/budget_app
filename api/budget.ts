import { neon } from "@neondatabase/serverless";
import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const body = req.body;
    console.log("Request body:", body);

    const { budget, balance, category, type, clerkId } = body;

    if (!budget || !balance || !category || !type || !clerkId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const initialBalance = type === "savings" ? 0 : balance;

    // Single query that checks user and creates budget
    const result = await sql`
      WITH user_check AS (
        SELECT EXISTS(SELECT 1 FROM users WHERE clerk_id = ${clerkId}) as exists
      )
      INSERT INTO budget_categories (
        budget, 
        balance,
        category,
        type,
        clerk_id,
        created_at,
        last_reset
      )
      SELECT
        ${budget}, 
        ${initialBalance},
        ${category},
        ${type},
        ${clerkId},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      WHERE EXISTS (SELECT 1 FROM user_check WHERE exists = true)
      RETURNING 
        budget_id::text as id,
        budget,
        balance,
        category,
        type,
        clerk_id,
        created_at,
        last_reset;
    `;

    if (!result || result.length === 0) {
      return res.status(404).json({
        error: "User not found",
        message: "Please create a user profile before adding budgets",
      });
    }

    return res.status(201).json({ data: result[0] });
  } catch (error: any) {
    console.error("Error in budget creation:", {
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
