import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const body = await request.json();
    console.log("Request body:", body);

    const {
      clerk_id,
      name,
      amount,
      frequency,
      start_date,
      end_date,
      category_id,
    } = body;

    // Validate required fields
    if (!clerk_id || !name || !amount || !frequency) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use frequency as-is, no conversion
    console.log("Using frequency:", frequency);

    const parsedCategoryId = category_id ? parseInt(category_id) : null;

    // Single query that checks user and creates fixed cost
    const result = await sql`
      WITH user_check AS (
        SELECT EXISTS(SELECT 1 FROM users WHERE clerk_id = ${clerk_id}) as exists
      )
      INSERT INTO fixed_costs (
        name,
        amount,
        frequency,
        start_date,
        end_date,
        category_id,
        clerk_id
      )
      SELECT
        ${name},
        ${amount},
        ${frequency},
        ${start_date || null},
        ${end_date || null},
        ${parsedCategoryId},
        ${clerk_id}
      WHERE EXISTS (SELECT 1 FROM user_check WHERE exists = true)
      RETURNING 
        id::text as id,
        name,
        amount,
        frequency,
        start_date::text,
        end_date::text,
        category_id::text,
        clerk_id,
        created_at::text,
        updated_at::text;
    `;

    if (!result || result.length === 0) {
      return Response.json(
        {
          error: "User not found",
          message: "Please create a user profile before adding fixed costs",
        },
        { status: 404 }
      );
    }

    // Ensure amount is converted to a number
    const fixedCost = {
      ...result[0],
      amount: Number(result[0].amount),
    };

    return Response.json({ data: fixedCost }, { status: 201 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in fixed cost creation:", errorMessage);

    return Response.json(
      {
        error: "Database Error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
