import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerk_id");

    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT
        budget_categories.budget, 
        budget_categories.balance, 
        budget_categories.category, 
        budget_categories.type, 
        budget_categories.created_at
      
      FROM budget_categories 
      WHERE budget_categories.clerk_id = ${id}
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching budget categories:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}