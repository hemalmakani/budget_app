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
    const { source_name, amount, received_on, recurring, frequency } = req.body;

    if (!source_name || !amount || !received_on) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let result;

    if (recurring) {
      // Recurring income: Add to incomes table (lambda will process later)
      // 2. Use verified clerkId instead of req.body.clerk_id
      result = await sql`
        INSERT INTO incomes (
          clerk_id,
          source_name,
          amount,
          received_on,
          recurring,
          frequency
        ) VALUES (
          ${clerkId},
          ${source_name},
          ${amount},
          ${received_on},
          ${recurring},
          ${frequency}
        )
        RETURNING 
          id,
          source_name,
          amount,
          received_on,
          recurring,
          frequency,
          created_at
      `;
    } else {
      // One-time income: Add directly to transactions table (matching Lambda logic)
      // Use verified clerkId instead of req.body.clerk_id
      result = await sql`
        INSERT INTO transactions (
          name,
          category_id,
          amount,
          created_at,
          category_name,
          clerk_id,
          type
        ) VALUES (
          ${source_name},
          ${null},
          ${amount},
          CURRENT_TIMESTAMP,
          ${"Income"},
          ${clerkId},
          ${"income"}
        )
        RETURNING 
          id,
          name as source_name,
          amount,
          created_at,
          ${"income"} as type
      `;
    }

    return res.status(201).json({ data: result[0] });
  } catch (error) {
    console.error("Error adding income:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
