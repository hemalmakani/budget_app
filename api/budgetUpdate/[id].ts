import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

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
      return res.status(400).json({ error: "Budget ID is required" });
    }

    const { budget, category, type, parent_category } = req.body;

    console.log("Update request received:", {
      id,
      budget,
      category,
      type,
      parent_category,
    });

    if (!budget || !category || !type) {
      console.log("Missing fields:", { budget, category, type });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    console.log("Executing SQL update with type:", type);

    // 2. Update budget AND verify ownership
    const response = await sql`
      UPDATE budget_categories 
      SET 
        budget = ${budget},
        category = ${category},
        type = ${type},
        parent_category = ${parent_category || null},
        balance = CASE 
          WHEN balance > ${budget} THEN ${budget}
          ELSE balance
        END
      WHERE budget_id = ${id} AND clerk_id = ${clerkId}
      RETURNING 
        budget_id::text as id,
        budget,
        balance,
        category,
        type,
        parent_category,
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
