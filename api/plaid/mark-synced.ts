import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

const sql = neon(`${process.env.DATABASE_URL}`);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { transactionId, clerkId } = req.body;

    console.log("🔄 Marking transaction as synced:", {
      transactionId,
      clerkId,
    });

    if (!transactionId || !clerkId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await sql`
      UPDATE plaid_transactions
      SET is_synced_to_transactions = true,
          updated_at = NOW()
      WHERE transaction_id = ${transactionId}
        AND clerk_id = ${clerkId}
      RETURNING id, transaction_id, is_synced_to_transactions
    `;

    console.log("✅ Transaction marked as synced:", result);

    if (result.length === 0) {
      console.warn("⚠️ No transaction found to update");
      return res.status(404).json({ error: "Transaction not found" });
    }

    return res.status(200).json({
      success: true,
      transaction: result[0],
    });
  } catch (error) {
    console.error("❌ Error marking transaction as synced:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
