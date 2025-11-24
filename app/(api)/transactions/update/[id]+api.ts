import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(request: Request, { id }: { id: string }) {
  try {
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Transaction ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { name, amount, category_id, category_name } = await request.json();

    if (!name || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing input fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the original transaction to calculate balance difference
    const originalResult = await sql`
      SELECT id, amount, category_id, category_name
      FROM transactions 
      WHERE id = ${id}::uuid
    `;

    if (!originalResult || originalResult.length === 0) {
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const originalTransaction = originalResult[0];
    const oldAmount = originalTransaction.amount;
    const oldCategoryId = originalTransaction.category_id;
    const newCategoryId = category_id || oldCategoryId;
    const amountDifference = amount - oldAmount;
    const categoryChanged = newCategoryId !== oldCategoryId;

    // Update the transaction
    const updateResult = await sql`
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

    const updatedTransaction = updateResult[0];
    let updatedBudget = null;

    // Handle budget balance updates
    if (categoryChanged) {
      // If category changed, restore balance to old category and deduct from new category
      if (oldCategoryId) {
        const oldBudgetInfo = await sql`
          SELECT type FROM budget_categories WHERE budget_id = ${oldCategoryId}
        `;
        
        if (oldBudgetInfo && oldBudgetInfo.length > 0) {
          if (oldBudgetInfo[0].type === 'savings') {
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
        const newBudgetInfo = await sql`
          SELECT type FROM budget_categories WHERE budget_id = ${newCategoryId}
        `;
        
        if (newBudgetInfo && newBudgetInfo.length > 0) {
          if (newBudgetInfo[0].type === 'savings') {
            const budgetResult = await sql`
              UPDATE budget_categories 
              SET balance = balance + ${amount}
              WHERE budget_id = ${newCategoryId}
              RETURNING balance, budget_id
            `;
            updatedBudget = budgetResult[0];
          } else {
            const budgetResult = await sql`
              UPDATE budget_categories 
              SET balance = balance - ${amount}
              WHERE budget_id = ${newCategoryId}
              RETURNING balance, budget_id
            `;
            updatedBudget = budgetResult[0];
          }
        }
      }
    } else if (amountDifference !== 0 && newCategoryId) {
      // Same category, just amount changed
      const budgetInfo = await sql`
        SELECT type FROM budget_categories WHERE budget_id = ${newCategoryId}
      `;
      
      if (budgetInfo && budgetInfo.length > 0) {
        if (budgetInfo[0].type === 'savings') {
          const budgetResult = await sql`
            UPDATE budget_categories 
            SET balance = balance + ${amountDifference}
            WHERE budget_id = ${newCategoryId}
            RETURNING balance, budget_id
          `;
          updatedBudget = budgetResult[0];
        } else {
          const budgetResult = await sql`
            UPDATE budget_categories 
            SET balance = balance - ${amountDifference}
            WHERE budget_id = ${newCategoryId}
            RETURNING balance, budget_id
          `;
          updatedBudget = budgetResult[0];
        }
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          transaction: updatedTransaction,
          budget: updatedBudget,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating transaction:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

