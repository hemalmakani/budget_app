import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify JWT and get authenticated user
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const {
      name,
      amount,
      frequency,
      start_date,
      end_date,
      category_id,
    } = req.body;

    // Validate required fields
    if (!name || !amount || !frequency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Frequency validation - database expects lowercase
    const allowedFrequencies = ["weekly", "biweekly", "monthly"];
    const normalizedFrequency = frequency.toLowerCase();

    if (!allowedFrequencies.includes(normalizedFrequency)) {
      return res.status(400).json({
        error:
          "Invalid frequency value. Must be one of: weekly, biweekly, monthly",
      });
    }

    const parsedCategoryId = category_id ? parseInt(category_id) : null;

    // 2. Use verified clerkId instead of req.body.clerk_id
    const result = await sql`
      INSERT INTO fixed_costs (
        name,
        amount,
        frequency,
        start_date,
        end_date,
        category_id,
        clerk_id
      ) VALUES (
        ${name},
        ${amount},
        ${normalizedFrequency},
        ${start_date || null},
        ${end_date || null},
        ${parsedCategoryId},
        ${clerkId}
      )
      RETURNING 
        id::text as id,
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

    // Ensure amount is converted to a number
    const fixedCost = {
      ...result[0],
      amount: Number(result[0].amount),
    };

    return res.status(201).json({ data: fixedCost });
  } catch (error: any) {
    console.error("Error in fixed cost creation:", {
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
