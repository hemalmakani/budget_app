import { neon } from "@neondatabase/serverless";
import { VercelRequest, VercelResponse } from "@vercel/node";
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

    const { startDate, endDate, categoryId } = req.query;

    console.log("API endpoint called with verified clerkId:", clerkId);

    // Validate required parameters
    if (!startDate || !endDate) {
      console.error("Missing required parameters:", {
        startDate,
        endDate,
      });
      return res.status(400).json({ error: "Missing required parameters" });
    }

    console.log("Fetching spending data with params:", {
      userId: clerkId,
      startDate,
      endDate,
      categoryId,
    });

    const sql = neon(process.env.DATABASE_URL!);

    // Build the SQL query based on parameters
    // 2. Use verified clerkId instead of query parameter
    let query;

    if (categoryId) {
      // With category filter
      query = sql`
        SELECT 
          t.id,
          t.amount::float as amount,
          t.created_at as date,
          t.name as description,
          t.category_id::text as category_id,
          bc.category as category_name,
          COALESCE(t.type, 'expense') as type
        FROM transactions t
        LEFT JOIN budget_categories bc ON t.category_id = bc.budget_id
        WHERE t.clerk_id = ${clerkId}
          AND t.created_at >= ${startDate}
          AND t.created_at <= ${endDate}
          AND t.category_id = ${categoryId}
        ORDER BY t.created_at DESC
      `;
    } else {
      // Without category filter
      query = sql`
        SELECT 
          t.id,
          t.amount::float as amount,
          t.created_at as date,
          t.name as description,
          t.category_id::text as category_id,
          bc.category as category_name,
          COALESCE(t.type, 'expense') as type
        FROM transactions t
        LEFT JOIN budget_categories bc ON t.category_id = bc.budget_id
        WHERE t.clerk_id = ${clerkId}
          AND t.created_at >= ${startDate}
          AND t.created_at <= ${endDate}
        ORDER BY t.created_at DESC
      `;
    }

    // Execute the query
    console.log("Executing SQL query...");

    const result = await query;
    console.log(`Query returned ${result.length} rows`);

    // Return the results
    return res.status(200).json({ data: result });
  } catch (error) {
    console.error("Error fetching spending data:", error);
    return res.status(500).json({
      error: "Failed to fetch spending data",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
