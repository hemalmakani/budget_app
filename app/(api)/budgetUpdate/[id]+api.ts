import { neon } from "@neondatabase/serverless";

export async function PUT(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "Budget ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { budget, category, type, parent_category } = body;

    console.log("Update request received:", {
      id,
      budget,
      category,
      type,
      parent_category,
    });

    if (!budget || !category || !type) {
      console.log("Missing fields:", { budget, category, type });
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    console.log("Executing SQL update with type:", type);

    const response = await sql`
      UPDATE budget_categories 
      SET 
        budget = ${budget},
        category = ${category},
        type = ${type},
        parent_category = ${parent_category || null}
      WHERE budget_id = ${id}
      RETURNING 
        budget_id::text as id,
        budget,
        balance,
        category,
        type,
        parent_category,
        clerk_id,
        created_at,
        last_reset
    `;

    if (!response || response.length === 0) {
      console.log("No budget found with ID:", id);
      return Response.json({ error: "Budget not found" }, { status: 404 });
    }

    console.log("Budget updated successfully:", response[0]);
    return Response.json({ data: response[0] });
  } catch (error: any) {
    console.error("Error updating budget:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    return Response.json(
      {
        error: "Database Error",
        details: error?.detail || error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
