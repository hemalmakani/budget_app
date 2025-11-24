import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const { name, amount, category_id, category_name } = req.body;

    if (!name || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid or missing input fields" });
    }

    // Get the original transaction to calculate balance difference
    const [originalTransaction] = await sql`
      SELECT id, amount, category_id, category_name
      FROM transactions 
      WHERE id = ${id}::uuid
    `;

    if (!originalTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const oldAmount = originalTransaction.amount;
    const oldCategoryId = originalTransaction.category_id;
    const newCategoryId = category_id || oldCategoryId;
    const amountDifference = amount - oldAmount;
    const categoryChanged = newCategoryId !== oldCategoryId;

    // Update the transaction
    const [updatedTransaction] = await sql`
      UPDATE transactions 
      SET 
        name = ${name},
        amount = ${amount},
        category_id = ${newCategoryId},
        category_name = ${category_name || originalTransaction.category_name}
      WHERE id = ${id}::uuid
      RETURNING 
        id,
        name,
        category_id,
        amount,
        created_at,
        category_name,
        clerk_id,
        type
    `;

    let updatedBudget = null;

    // Handle budget balance updates
    if (categoryChanged) {
      // If category changed, restore balance to old category and deduct from new category
      if (oldCategoryId) {
        // Get the old budget type
        const [oldBudgetInfo] = await sql`
          SELECT type FROM budget_categories WHERE budget_id = ${oldCategoryId}
        `;
        
        if (oldBudgetInfo) {
          // For savings, we added on transaction create, so subtract on restore
          // For other types, we subtracted on create, so add on restore
          if (oldBudgetInfo.type === 'savings') {
            await sql`
              UPDATE budget_categories 
              SET balance = balance - ${oldAmount}
              WHERE budget_id = ${oldCategoryId}
            `;
          } else {
            await sql`
              UPDATE budget_categories 
              SET balance = balance + ${oldAmount}
              WHERE budget_id = ${oldCategoryId}
            `;
          }
        }
      }

      if (newCategoryId) {
        // Get the new budget type
        const [newBudgetInfo] = await sql`
          SELECT type FROM budget_categories WHERE budget_id = ${newCategoryId}
        `;
        
        if (newBudgetInfo) {
          // For savings, add the amount; for other types, subtract
          if (newBudgetInfo.type === 'savings') {
            const [budget] = await sql`
              UPDATE budget_categories 
              SET balance = balance + ${amount}
              WHERE budget_id = ${newCategoryId}
              RETURNING balance, budget_id
            `;
            updatedBudget = budget;
          } else {
            const [budget] = await sql`
              UPDATE budget_categories 
              SET balance = balance - ${amount}
              WHERE budget_id = ${newCategoryId}
              RETURNING balance, budget_id
            `;
            updatedBudget = budget;
          }
        }
      }
    } else if (amountDifference !== 0 && newCategoryId) {
      // Same category, just amount changed
      const [budgetInfo] = await sql`
        SELECT type FROM budget_categories WHERE budget_id = ${newCategoryId}
      `;
      
      if (budgetInfo) {
        // For savings: if amount increased, add the difference; if decreased, subtract
        // For other types: if amount increased, subtract the difference; if decreased, add
        if (budgetInfo.type === 'savings') {
          const [budget] = await sql`
            UPDATE budget_categories 
            SET balance = balance + ${amountDifference}
            WHERE budget_id = ${newCategoryId}
            RETURNING balance, budget_id
          `;
          updatedBudget = budget;
        } else {
          const [budget] = await sql`
            UPDATE budget_categories 
            SET balance = balance - ${amountDifference}
            WHERE budget_id = ${newCategoryId}
            RETURNING balance, budget_id
          `;
          updatedBudget = budget;
        }
      }
    }

    return res.status(200).json({
      data: {
        transaction: updatedTransaction,
        budget: updatedBudget,
      },
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

