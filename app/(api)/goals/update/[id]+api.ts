import { neon } from "@neondatabase/serverless";

export async function PUT(request: Request, { id }: { id: string }) {
  try {
    const body = await request.json();

    if (!id) {
      return Response.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const {
      goal_name,
      goal_type,
      target_amount,
      target_percentage,
      target_date,
      status,
      category_id,
    } = body;

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Normalize goal_type if provided
    const normalizedGoalType =
      goal_type && typeof goal_type === "string"
        ? goal_type.toUpperCase()
        : goal_type;

    // Use neon's tagged template literal syntax
    const result = await sql`
      UPDATE goals 
      SET 
        goal_name = COALESCE(${goal_name}, goal_name),
        goal_type = COALESCE(${normalizedGoalType}, goal_type),
        target_amount = COALESCE(${target_amount}, target_amount),
        target_percentage = COALESCE(${target_percentage}, target_percentage),
        target_date = COALESCE(${target_date}, target_date),
        status = COALESCE(${status}, status),
        category_id = COALESCE(${category_id ? parseInt(category_id) : null}, category_id)
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
        created_at::text as updated_at
    `;

    if (result.length === 0) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }

    return Response.json({ data: result[0] });
  } catch (error) {
    console.error("Error updating goal:", error);
    const errorResponse = {
      error: "Failed to update goal",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return Response.json(errorResponse, { status: 500 });
  }
}
