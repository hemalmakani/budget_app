import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocket = ws;
const sql = neon(process.env.DATABASE_URL!);

export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    // Extract the `id` from the request URL
    const url = new URL(request.url);

    if (!id) {
      throw new Error("Transaction ID is required");
    }

    console.log("Deleting transaction ID:", id);

    const result = await sql`
      WITH deleted_transaction AS (
        DELETE FROM transactions
        WHERE id = ${id}::uuid
        RETURNING category_id, amount
      ),
      updated_budget AS (
        UPDATE budget_categories
        SET balance = balance + (SELECT amount FROM deleted_transaction)
        WHERE budget_id = (SELECT category_id FROM deleted_transaction)
        RETURNING *
      )
      SELECT 
        json_build_object(
          'transaction', (SELECT row_to_json(deleted_transaction.*) FROM deleted_transaction),
          'budget', (SELECT row_to_json(updated_budget.*) FROM updated_budget)
        ) as result
    `;

    // Check if the transaction was deleted
    if (!result?.[0]?.result?.transaction) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ data: result[0].result }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);

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
