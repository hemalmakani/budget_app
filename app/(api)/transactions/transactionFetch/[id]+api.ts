import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT 
        t.id,
        t.name,
        t.category_id,
        t.amount,
        t.created_at,
        t.category_name,
        bc.type as category_type
      FROM transactions t
      LEFT JOIN budget_categories bc ON t.category_id = bc.budget_id
      WHERE t.clerk_id = ${id}
      ORDER BY t.created_at DESC;
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
