import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const body = await request.json();
    console.log("Request body:", body);

    const { budget, balance, category, type, clerkId } = body;

    if (!budget || !balance || !category || !type || !clerkId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
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
      return Response.json(
        {
          error: "User not found",
          message: "Please create a user profile before adding budgets",
        },
        { status: 404 }
      );
    }

    return Response.json({ data: result[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error in budget creation:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    return Response.json(
      {
        error: "Database Error",
        details: error?.detail || error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
