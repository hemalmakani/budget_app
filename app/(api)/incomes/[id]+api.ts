import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT 
        id,
        source_name,
        amount,
        received_on,
        recurring,
        frequency,
        created_at
      FROM incomes 
      WHERE clerk_id = ${id}
      ORDER BY received_on DESC, created_at DESC
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching incomes:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
