import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Get the current year
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    const response = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM incomes 
      WHERE clerk_id = ${id}
      AND received_on >= ${startOfYear}
      AND received_on <= ${endOfYear}
    `;

    const total = response[0]?.total ?? 0;
    return Response.json({ data: { total } });
  } catch (error) {
    console.error("Error fetching total income:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
