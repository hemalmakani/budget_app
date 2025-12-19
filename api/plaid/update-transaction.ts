import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { transactionId, name, category } = req.body;

    console.log("Update request received:", {
      transactionId,
      name,
      category,
      clerkId,
    });

    if (!transactionId) {
      console.log("Missing required transactionId");
      return res.status(400).json({ error: "Missing required transactionId" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    console.log("Executing SQL update");

    // Build update query based on what fields are provided
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = $" + (values.length + 1));
      values.push(name);
    }

    if (category !== undefined) {
      // Store the edited category in a separate field or update merchant_name
      updates.push("merchant_name = $" + (values.length + 1));
      values.push(category);
    }

    const response = await sql`
      UPDATE plaid_transactions 
      SET 
        name = ${name || sql`name`},
        updated_at = NOW()
      WHERE transaction_id = ${transactionId}
        AND clerk_id = ${clerkId}
      RETURNING 
        id,
        transaction_id,
        name,
        merchant_name,
        amount,
        date,
        category,
        subcategory,
        plaid_category_id,
        transaction_type,
        pending,
        iso_currency_code,
        is_synced_to_transactions,
        created_at,
        updated_at
    `;

    if (!response || response.length === 0) {
      console.log("No transaction found with ID:", transactionId);
      return res.status(404).json({ error: "Transaction not found" });
    }

    console.log("Transaction updated successfully:", response[0]);
    return res.status(200).json({ data: response[0] });
  } catch (error: any) {
    console.error("Error updating transaction:", {
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
