import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure neon to use WebSocket polyfill
neonConfig.webSocket = ws;

// Create a single connection instance
const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get manual transactions with retry logic
    let manualTransactions = [];
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        manualTransactions = await sql`
          SELECT
            transactions.name as transaction_name, 
            transactions.category_id as budget_id, 
            transactions.amount, 
            transactions.category_name as budget_name, 
            transactions.created_at,
            transactions.id::text as transaction_id,
            transactions.clerk_id,
            'manual' as source
          FROM transactions
          WHERE transactions.clerk_id = ${id}
        `;
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Get Plaid transactions with retry logic
    let plaidTransactions = [];
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        plaidTransactions = await sql`
          SELECT
            plaid_transactions.name as transaction_name,
            plaid_transactions.category_id as budget_id,
            plaid_transactions.amount,
            plaid_transactions.category as budget_name,
            plaid_transactions.date as created_at,
            plaid_transactions.id::text as transaction_id,
            plaid_transactions.clerk_id,
            'plaid' as source
          FROM plaid_transactions
          WHERE plaid_transactions.clerk_id = ${id}
        `;
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Combine and sort transactions by date
    const allTransactions = [...manualTransactions, ...plaidTransactions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return Response.json({ data: allTransactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);

    // More detailed error message
    const errorMessage =
      error instanceof Error
        ? `Database error: ${error.message}`
        : "Internal Server Error";

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
