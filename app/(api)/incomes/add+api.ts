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

    const result = await sql`
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

    return Response.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error adding income:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
