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

    // First get the transaction details before deleting
    const transactionQuery = await sql`
      SELECT id, amount, category_id, type, clerk_id
      FROM transactions 
      WHERE id = ${id}
    `;

    if (!transactionQuery || transactionQuery.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction = transactionQuery[0];

    // Delete the transaction
    const result = await sql`
      DELETE FROM transactions 
      WHERE id = ${id}
      RETURNING id, amount, category_id
    `;

    let updatedBudget = null;

    // Only update budget balance if it's not an income transaction (category_id is not null)
    if (transaction.category_id && transaction.type !== "income") {
      const budgetResult = await sql`
        UPDATE budget_categories 
        SET balance = balance + ${transaction.amount}
        WHERE budget_id = ${transaction.category_id}
        RETURNING balance, budget_id
      `;

      if (budgetResult.length > 0) {
        updatedBudget = budgetResult[0];
      }
    }

    return res.status(200).json({
      data: {
        transaction: {
          id: result[0].id,
          amount: result[0].amount,
          category_id: result[0].category_id,
          type: transaction.type,
          clerk_id: transaction.clerk_id,
        },
        budget: updatedBudget,
      },
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
