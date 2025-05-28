import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { clerk_id, source_name, amount, received_on, recurring, frequency } =
      req.body;

    if (!clerk_id || !source_name || !amount || !received_on) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await sql`
      INSERT INTO incomes (
        clerk_id,
        source_name,
        amount,
        received_on,
        recurring,
        frequency
      ) VALUES (
        ${clerk_id},
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

    return res.status(201).json({ data: result[0] });
  } catch (error) {
    console.error("Error adding income:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
