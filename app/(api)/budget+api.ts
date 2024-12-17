import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { budget, balance, category, type, clerkId } = await request.json();

    if (!budget || !balance || !category || !type || !clerkId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await sql`
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
      ) 
      RETURNING 
        budget_id::text as id,
        budget,
        balance,
        category,
        type,
        clerk_id,
        created_at;
    `;

    return Response.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error adding budget category:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
