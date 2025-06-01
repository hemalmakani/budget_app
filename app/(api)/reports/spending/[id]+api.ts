import { neon } from "@neondatabase/serverless";

// Create a single neon client for reuse
const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request, { id }: { id: string }) {
  try {
    console.log("API endpoint called with id:", id);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");

    // Validate required parameters
    if (!id || !startDate || !endDate) {
      console.error("Missing required parameters:", {
        id,
        startDate,
        endDate,
      });
      return Response.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("Fetching spending data with params:", {
      userId: id,
      startDate,
      endDate,
      categoryId,
    });

    // Build the SQL query based on parameters
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
        WHERE t.clerk_id = ${id}
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
        WHERE t.clerk_id = ${id}
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
    return Response.json({ data: result });
  } catch (error) {
    console.error("Error fetching spending data:", error);
    return Response.json(
      {
        error: "Failed to fetch spending data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
