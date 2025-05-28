import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Goal ID is required" });
    }

    const {
      goal_name,
      goal_type,
      target_amount,
      target_percentage,
      start_date,
      target_date,
      status,
      category_id,
      current_amount,
    } = req.body;

    const sql = neon(`${process.env.DATABASE_URL}`);
    const parsedCategoryId = category_id ? parseInt(category_id) : null;
    const normalizedGoalType =
      typeof goal_type === "string" ? goal_type.toUpperCase() : goal_type;

    const result = await sql`
      UPDATE goals 
      SET 
        goal_name = ${goal_name},
        goal_type = ${normalizedGoalType},
        target_amount = ${target_amount || null},
        target_percentage = ${target_percentage || null},
        start_date = ${start_date},
        target_date = ${target_date || null},
        status = ${status},
        category_id = ${parsedCategoryId},
        current_amount = ${current_amount || 0}
      WHERE goal_id = ${id}
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
        updated_at::text
    `;

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }

    return res.status(200).json({ data: result[0] });
  } catch (error: any) {
    console.error("Error updating goal:", {
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
