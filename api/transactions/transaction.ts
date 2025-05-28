import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { name, categoryId, amount, clerkId, category_name } = req.body;

    if (!name || !categoryId || !amount || !clerkId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Start transaction to create transaction and update budget
    const [transaction] = await sql`
      INSERT INTO transactions (
        name,
        category_id,
        amount,
        clerk_id,
        category_name
      ) VALUES (
        ${name},
        ${categoryId},
        ${amount},
        ${clerkId},
        ${category_name}
      )
      RETURNING 
        id,
        name,
        category_id,
        amount,
        created_at,
        category_name
    `;

    // Update budget balance
    const [budget] = await sql`
      UPDATE budget_categories 
      SET balance = balance - ${amount}
      WHERE budget_id = ${categoryId}
      RETURNING balance
    `;

    return res.status(201).json({
      data: {
        transaction,
        budget,
      },
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
