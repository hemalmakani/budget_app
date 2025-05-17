import { neon } from "@neondatabase/serverless";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Fixed cost ID is required" }),
        { status: 400 }
      );
    }
    const result =
      await sql`SELECT id::text, clerk_id, name, amount, frequency, start_date::text, end_date::text, category_id::text, created_at::text, updated_at::text FROM fixed_costs WHERE id = ${id}`;
    if (result.length === 0) {
      return new Response(JSON.stringify({ error: "Fixed cost not found" }), {
        status: 404,
      });
    }
    return new Response(JSON.stringify({ data: result[0] }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch fixed cost",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    const url = new URL(request.url);
    const clerk_id = url.searchParams.get("clerk_id");

    if (!id) {
      return Response.json(
        { error: "Fixed cost ID is required" },
        { status: 400 }
      );
    }
    if (!clerk_id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Delete in a single query with ownership check embedded
    const result = await sql`
      DELETE FROM fixed_costs 
      WHERE id = ${id} AND clerk_id = ${clerk_id}
      RETURNING id::text, name, category_id::text
    `;

    if (result.length === 0) {
      // No rows deleted - either not found or not authorized
      return Response.json(
        { error: "Fixed cost not found or not authorized" },
        { status: 404 }
      );
    }

    return Response.json({
      data: {
        id: result[0].id,
        name: result[0].name,
        category_id: result[0].category_id,
      },
      message: "Fixed cost deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting fixed cost:", error);
    return Response.json(
      {
        error: "Database Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
