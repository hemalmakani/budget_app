import { neon } from "@neondatabase/serverless";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { id } = params;
    const body = await request.json();
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Fixed cost ID is required" }),
        { status: 400 }
      );
    }
    const {
      name,
      amount,
      frequency,
      start_date,
      end_date,
      category_id,
      clerk_id,
    } = body;

    if (frequency) {
      // Use frequency as-is, no conversion
      console.log("Using frequency:", frequency);
    }

    const result = await sql`
      UPDATE fixed_costs
      SET
        name = COALESCE(${name}, name),
        amount = COALESCE(${amount}, amount),
        frequency = COALESCE(${frequency}, frequency),
        start_date = COALESCE(${start_date}, start_date),
        end_date = COALESCE(${end_date}, end_date),
        category_id = COALESCE(${category_id ? parseInt(category_id) : null}, category_id),
        clerk_id = COALESCE(${clerk_id}, clerk_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
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
        updated_at::text;
    `;
    if (result.length === 0) {
      return new Response(JSON.stringify({ error: "Fixed cost not found" }), {
        status: 404,
      });
    }

    // Ensure amount is a number
    const fixedCost = {
      ...result[0],
      amount: Number(result[0].amount),
    };

    return new Response(JSON.stringify({ data: fixedCost }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to update fixed cost",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
