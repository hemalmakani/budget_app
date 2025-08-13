import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Fixed cost ID is required" });
    }

    const { name, amount, frequency, start_date, end_date, category_id } =
      req.body;

    if (!name || !amount || !frequency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Frequency validation
    const allowedFrequencies = ["weekly", "biweekly", "monthly"];
    const normalizedFrequency = frequency.toLowerCase();

    if (!allowedFrequencies.includes(normalizedFrequency)) {
      return res.status(400).json({
        error:
          "Invalid frequency value. Must be one of: weekly, biweekly, monthly",
      });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const parsedCategoryId = category_id ? parseInt(category_id) : null;

    const result = await sql`
      UPDATE fixed_costs 
      SET 
        name = ${name},
        amount = ${amount},
        frequency = ${normalizedFrequency},
        start_date = ${start_date || null},
        end_date = ${end_date || null},
        category_id = ${parsedCategoryId}
      WHERE id = ${id}
      RETURNING 
        id::text,
        name,
        amount,
        frequency,
        start_date::text,
        end_date::text,
        category_id::text,
        clerk_id,
        created_at::text,
        updated_at::text
    `;

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Fixed cost not found" });
    }

    // Ensure amount is converted to a number
    const fixedCost = {
      ...result[0],
      amount: Number(result[0].amount),
    };

    return res.status(200).json({ data: fixedCost });
  } catch (error: any) {
    console.error("Error updating fixed cost:", {
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
