import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const result = await sql`
      DELETE FROM transactions 
      WHERE id = ${id}
      RETURNING id, amount, category_id
    `;

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Restore budget balance
    if (result[0].category_id) {
      await sql`
        UPDATE budget_categories 
        SET balance = balance + ${result[0].amount}
        WHERE budget_id = ${result[0].category_id}
      `;
    }

    return res.status(200).json({
      data: { id: result[0].id },
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
