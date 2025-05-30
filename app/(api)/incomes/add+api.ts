import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const body = await request.json();

    const { clerk_id, source_name, amount, received_on, recurring, frequency } =
      body;

    if (!clerk_id || !source_name || !amount || !received_on) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let result;

    if (recurring) {
      // Recurring income: Add to incomes table (lambda will process later)
      result = await sql`
        INSERT INTO incomes (
          clerk_id,
          source_name,
          amount,
          received_on,
          recurring,
          frequency
        ) VALUES (
          ${clerk_id},
          ${source_name},
          ${amount},
          ${received_on},
          ${recurring},
          ${frequency}
        )
        RETURNING 
          id,
          source_name,
          amount,
          received_on,
          recurring,
          frequency,
          created_at
      `;
    } else {
      // One-time income: Add directly to transactions table
      result = await sql`
        INSERT INTO transactions (
          name,
          category_id,
          amount,
          created_at,
          category_name,
          clerk_id,
          type
        ) VALUES (
          ${source_name},
          ${null},
          ${amount},
          CURRENT_TIMESTAMP,
          ${"Income"},
          ${clerk_id},
          ${"income"}
        )
        RETURNING 
          id,
          name as source_name,
          amount,
          created_at,
          ${"income"} as type
      `;
    }

    return Response.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error adding income:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
