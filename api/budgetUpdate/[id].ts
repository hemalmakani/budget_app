import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Budget ID is required" });
    }

    const { budget, category, type } = req.body;

    console.log("Update request received:", { id, budget, category, type });

    if (!budget || !category || !type) {
      console.log("Missing fields:", { budget, category, type });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    console.log("Executing SQL update with type:", type);

    const response = await sql`
      UPDATE budget_categories 
      SET 
        budget = ${budget},
        category = ${category},
        type = ${type},
        balance = CASE 
          WHEN balance > ${budget} THEN ${budget}
          ELSE balance
        END
      WHERE budget_id = ${id}
      RETURNING 
        budget_id::text as id,
        budget,
        balance,
        category,
        type,
        clerk_id,
        created_at,
        last_reset
    `;

    if (!response || response.length === 0) {
      console.log("No budget found with ID:", id);
      return res.status(404).json({ error: "Budget not found" });
    }

    console.log("Budget updated successfully:", response[0]);
    return res.status(200).json({ data: response[0] });
  } catch (error: any) {
    console.error("Error updating budget:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    return res.status(500).json({
      error: "Database Error",
      details: error?.detail || error?.message || "Unknown error",
    });
  }
}
