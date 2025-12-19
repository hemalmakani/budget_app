import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify JWT and get authenticated user
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Get the current year
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    // Get total from recurring incomes (incomes table)
    // 2. Use verified clerkId instead of query parameter
    const recurringIncomesResponse = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM incomes 
      WHERE clerk_id = ${clerkId}
      AND received_on >= ${startOfYear}
      AND received_on <= ${endOfYear}
    `;

    // Get total from one-time incomes (transactions table with type='income')
    const oneTimeIncomesResponse = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions 
      WHERE clerk_id = ${clerkId}
      AND type = 'income'
      AND created_at >= ${startOfYear}
      AND created_at <= ${endOfYear}
    `;

    const recurringTotal = recurringIncomesResponse[0]?.total ?? 0;
    const oneTimeTotal = oneTimeIncomesResponse[0]?.total ?? 0;
    const total = Number(recurringTotal) + Number(oneTimeTotal);

    return res.status(200).json({ data: { total } });
  } catch (error) {
    console.error("Error fetching total income:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
