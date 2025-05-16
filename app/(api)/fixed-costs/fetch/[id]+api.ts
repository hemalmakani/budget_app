import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const result = await sql`
      SELECT 
        id::text, 
        clerk_id, 
        name, 
        amount, 
        frequency, 
        start_date::text, 
        end_date::text, 
        category_id::text,
        created_at::text,
        updated_at::text
      FROM fixed_costs
      WHERE clerk_id = ${id}
      ORDER BY created_at DESC
    `;

    // Convert amount to number for each fixed cost
    const formattedResults = result.map((item) => {
      return {
        ...item,
        amount: Number(item.amount),
      };
    });

    return Response.json({ data: formattedResults });
  } catch (error: any) {
    console.error("Error fetching fixed costs:", {
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
