import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "User ID is required" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Get the current year
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    const response = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM incomes 
      WHERE clerk_id = ${id}
      AND received_on >= ${startOfYear}
      AND received_on <= ${endOfYear}
    `;

    const total = response[0]?.total ?? 0;
    return res.status(200).json({ data: { total } });
  } catch (error) {
    console.error("Error fetching total income:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
