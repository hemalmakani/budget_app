import { neon } from "@neondatabase/serverless";

export async function PUT(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json(
        { error: "Fixed cost ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      amount,
      frequency,
      start_date,
      end_date,
      category_id,
      clerk_id,
    } = body;

    if (!clerk_id) {
      console.log("Missing clerk_id");
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    console.log("Update request received:", {
      id,
      name,
      amount,
      frequency,
      clerk_id,
    });

    const sql = neon(`${process.env.DATABASE_URL}`);

    const result = await sql`
      UPDATE fixed_costs
      SET
        name = COALESCE(${name}, name),
        amount = COALESCE(${amount}, amount),
        frequency = COALESCE(${frequency}, frequency),
        start_date = COALESCE(${start_date}, start_date),
        end_date = COALESCE(${end_date}, end_date),
        category_id = COALESCE(${category_id ? parseInt(category_id) : null}, category_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND clerk_id = ${clerk_id}
      RETURNING 
        id::text,
        clerk_id,
        name,
        amount,
        frequency,
        start_date::text,
        end_date::text,
        category_id::text,
        created_at::text,
        updated_at::text
    `;

    if (!result || result.length === 0) {
      console.log("No fixed cost found with ID:", id);
      return Response.json(
        { error: "Fixed cost not found or not authorized" },
        { status: 404 }
      );
    }

    // Ensure amount is a number
    const fixedCost = {
      ...result[0],
      amount: Number(result[0].amount),
    };

    console.log("Fixed cost updated successfully:", fixedCost);
    return Response.json({ data: fixedCost });
  } catch (error: any) {
    console.error("Error updating fixed cost:", {
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
