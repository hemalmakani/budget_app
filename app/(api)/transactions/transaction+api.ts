import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure neon to use WebSocket polyfill
neonConfig.webSocket = ws;

// Create a single connection instance
const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const { name, categoryId, amount, clerkId } = await request.json();

    // Validate required fields
    if (
      !name ||
      !categoryId ||
      !clerkId ||
      typeof amount !== "number" ||
      amount <= 0
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing input fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Execute both queries within a single prepared statement
    const result = await sql`
      WITH new_transaction AS (
        INSERT INTO transactions (
          name,
          category_id,
          amount,
          created_at
        )
        VALUES (
          ${name},
          ${categoryId},
          ${amount},
          NOW()
        )
        RETURNING *
      ),
      updated_budget AS (
        UPDATE budget_categories
        SET balance = balance - ${amount}
        WHERE budget_id = ${categoryId}
        RETURNING *
      )
      SELECT 
        json_build_object(
          'transaction', (SELECT row_to_json(new_transaction.*) FROM new_transaction),
          'budget', (SELECT row_to_json(updated_budget.*) FROM updated_budget)
        ) as result
    `;

    // Check if we got a result
    if (!result?.[0]?.result) {
      throw new Error("Failed to process transaction");
    }

    return new Response(JSON.stringify({ data: result[0].result }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error adding transaction:", error);

    // Handle specific database errors
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
