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
        name,
        category_id,
        amount,
        created_at,
        category_name
      FROM transactions 
      WHERE clerk_id = ${id}
      ORDER BY created_at DESC
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
