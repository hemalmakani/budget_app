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
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const parsedCategoryId = category_id ? parseInt(category_id) : null;

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
        ${goal_type},
        ${target_amount || null},
        ${target_percentage || null},
        ${start_date},
        ${target_date || null},
        ${status || "ACTIVE"},
        ${parsedCategoryId},
        0
      )
      RETURNING *;
    `;

    return new Response(JSON.stringify({ data: result[0] }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("Error creating goal:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create goal",
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
