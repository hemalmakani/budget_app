import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM incomes 
      WHERE clerk_id = ${id}
    `;

    const total = response[0]?.total ?? 0;
    return Response.json({ data: { total } });
  } catch (error) {
    console.error("Error fetching total income:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
