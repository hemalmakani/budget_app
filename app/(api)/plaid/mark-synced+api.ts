import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { transactionId, clerkId } = await request.json();

    if (!transactionId || !clerkId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await sql`
      UPDATE plaid_transactions
      SET is_synced_to_transactions = true,
          updated_at = NOW()
      WHERE transaction_id = ${transactionId}
        AND clerk_id = ${clerkId}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error marking transaction as synced:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
