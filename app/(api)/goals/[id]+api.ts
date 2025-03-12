import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Query matches the actual schema structure
    const response = await sql`
      SELECT 
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
        COALESCE(created_at::text) as updated_at
      FROM goals 
      WHERE clerk_id = ${id}
      ORDER BY created_at DESC
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching goals:", error);
    const errorResponse = {
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return Response.json(errorResponse, { status: 500 });
  }
}

export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const result = await sql`
      DELETE FROM goals 
      WHERE goal_id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }

    return Response.json({ data: result[0] });
  } catch (error) {
    console.error("Error deleting goal:", error);
    const errorResponse = {
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    };
    return Response.json(errorResponse, { status: 500 });
  }
}
