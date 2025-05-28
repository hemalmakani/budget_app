import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const {
      clerk_id,
      goal_name,
      goal_type,
      target_amount,
      target_percentage,
      start_date,
      target_date,
      status,
      category_id,
    } = req.body;

    if (!clerk_id || !goal_name || !goal_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const parsedCategoryId = category_id ? parseInt(category_id) : null;
    const normalizedGoalType =
      typeof goal_type === "string" ? goal_type.toUpperCase() : goal_type;

    const result = await sql`
      INSERT INTO goals (
        clerk_id,
        goal_name, 
        goal_type,
        target_amount,
        target_percentage,
        start_date,
        target_date,
        status,
        category_id,
        current_amount
      ) VALUES (
        ${clerk_id},
        ${goal_name},
        ${normalizedGoalType},
        ${target_amount || null},
        ${target_percentage || null},
        ${start_date},
        ${target_date || null},
        ${status || "ACTIVE"},
        ${parsedCategoryId},
        0
      )
      RETURNING 
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
        created_at::text as updated_at
    `;

    return res.status(201).json({ data: result[0] });
  } catch (error) {
    console.error("Error creating goal:", error);
    return res.status(500).json({
      error: "Failed to create goal",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
