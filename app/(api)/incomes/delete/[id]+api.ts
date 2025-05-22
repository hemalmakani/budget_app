import { neon } from "@neondatabase/serverless";

export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "Income ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Delete the income
    const result = await sql`
      DELETE FROM incomes 
      WHERE id = ${id}
      RETURNING id, source_name
    `;

    if (result.length === 0) {
      return Response.json({ error: "Income not found" }, { status: 404 });
    }

    return Response.json({
      data: { message: "Income deleted successfully", income: result[0] },
    });
  } catch (error) {
    console.error("Error deleting income:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
