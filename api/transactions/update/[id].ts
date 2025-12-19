import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify JWT and get authenticated user
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const { name, amount, category_id, category_name } = req.body;

    if (!name || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid or missing input fields" });
    }

    // 2. Get original transaction AND verify ownership
    const [originalTransaction] = await sql`
      SELECT id, amount, category_id, category_name
      FROM transactions 
      WHERE id = ${id}::uuid AND clerk_id = ${clerkId}
    `;

    if (!originalTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const oldAmount = originalTransaction.amount;
    const oldCategoryId = originalTransaction.category_id;
    const newCategoryId = category_id || oldCategoryId;
    const amountDifference = amount - oldAmount;
    const categoryChanged = newCategoryId !== oldCategoryId;

    // 3. Update the transaction (clerk_id check ensures ownership)
    const [updatedTransaction] = await sql`
      UPDATE transactions 
      SET 
        name = ${name},
        amount = ${amount},
        category_id = ${newCategoryId},
        category_name = ${category_name || originalTransaction.category_name}
      WHERE id = ${id}::uuid AND clerk_id = ${clerkId}
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

    // ... existing budget balance update logic stays the same ...
    let updatedBudget = null;

    if (categoryChanged) {
      if (oldCategoryId) {
        const [oldBudgetInfo] = await sql`
          SELECT type FROM budget_categories WHERE budget_id = ${oldCategoryId}
        `;

        if (oldBudgetInfo) {
          if (oldBudgetInfo.type === "savings") {
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
        const [newBudgetInfo] = await sql`
          SELECT type FROM budget_categories WHERE budget_id = ${newCategoryId}
        `;

        if (newBudgetInfo) {
          if (newBudgetInfo.type === "savings") {
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
      const [budgetInfo] = await sql`
        SELECT type FROM budget_categories WHERE budget_id = ${newCategoryId}
      `;

      if (budgetInfo) {
        if (budgetInfo.type === "savings") {
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
