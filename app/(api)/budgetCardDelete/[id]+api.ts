import { neon } from "@neondatabase/serverless";

export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    const url = new URL(request.url);

    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      DELETE FROM budget_categories 
      WHERE budget_categories.budget_id = ${id}
      RETURNING budget_id::text as budget_id
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching budget categories:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
