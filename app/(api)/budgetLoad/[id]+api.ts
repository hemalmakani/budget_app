// app/api/budget/route.ts
import { sql } from "@/lib/db";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json(
        { error: "User ID (Clerk) is required" },
        { status: 400 }
      );
    }

    const response = await sql`
      SELECT
        budget, 
        balance, 
        category, 
        type, 
        created_at,
        budget_id::text as id
      FROM budget_categories 
      WHERE clerk_id = ${id}
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching budget categories:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
