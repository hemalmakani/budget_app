import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    // Get the userId from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const clerkId = pathParts[pathParts.length - 1];

    if (!clerkId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Fetch all budget categories for the user
    const response = await sql`
      SELECT 
        id,
        budget,
        balance,
        category,
        type,
        clerk_id,
        created_at
      FROM budget_categories 
      WHERE clerk_id = ${clerkId}
      ORDER BY created_at DESC;
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching budget categories:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { budget, balance, category, type, clerkId } = await request.json();

    // Validate required fields
    if (!budget || !balance || !category || !type || !clerkId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert the new category into the database
    const response = await sql`
      INSERT INTO budget_categories (
        budget, 
        balance,
        category,
        type,
        clerk_id,
        created_at
      ) 
      VALUES (
        ${budget}, 
        ${balance},
        ${category},
        ${type},
        ${clerkId},
        NOW()
      ) RETURNING *;
    `;

    return new Response(JSON.stringify({ data: response }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error adding budget category:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
