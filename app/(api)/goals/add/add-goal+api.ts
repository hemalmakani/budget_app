// app/api/goals/route.ts
import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();

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
    } = body;

    if (!clerk_id || !goal_name || !goal_type) {
      const errorResponse = {
        error: "Missing required fields",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
        created_at::text as updated_at;
    `;

    const responseData = {
      data: result[0],
    };

    return new Response(JSON.stringify(responseData), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating goal:", error);
    const errorResponse = {
      error: "Failed to create goal",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
