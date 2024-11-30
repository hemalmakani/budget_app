import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const url = new URL(request.url);

    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT
        transactions.name as transaction_name, 
        transactions.category_id as budget_id, 
        transactions.amount, 
        transactions.category_name as budget_name, 
        transactions.created_at,
        transactions.id::text as transaction_id,
        transactions.clerk_id
      
      FROM transactions
      WHERE transactions.clerk_id = ${id}
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching budget categories:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
