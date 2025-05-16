import { neon } from "@neondatabase/serverless";

export async function GET(
  request: Request,
  { params }: { params: { clerkId: string } }
) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { clerkId } = params;

    if (!clerkId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    console.log("Fetching fixed costs for clerk_id:", clerkId);

    // Get the fixed costs data including all necessary fields
    const result = await sql`
      SELECT 
        id::text, 
        clerk_id, 
        name, 
        amount, 
        frequency, 
        start_date::text, 
        end_date::text, 
        category_id::text,
        created_at::text,
        updated_at::text
      FROM fixed_costs
      WHERE clerk_id = ${clerkId}
      ORDER BY created_at DESC
    `;

    // Log the number of results for debugging
    console.log(`Found ${result.length} fixed costs for user ${clerkId}`);

    // Frequency mapping from DB to frontend format
    const frequencyMapping: Record<string, string> = {
      weekly: "weekly",
      "bi-weekly": "biweekly", // Map from DB format to frontend format
      monthly: "monthly",
    };

    // Convert amount to number and map frequency for each fixed cost
    const formattedResults = result.map((item) => {
      // Get the frequency value or use the original if not found in mapping
      const frontendFrequency =
        item.frequency in frequencyMapping
          ? frequencyMapping[item.frequency as keyof typeof frequencyMapping]
          : item.frequency;

      return {
        ...item,
        amount: Number(item.amount),
        frequency: frontendFrequency,
      };
    });

    return Response.json({ data: formattedResults });
  } catch (error: any) {
    console.error("Error fetching fixed costs:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    return Response.json(
      {
        error: "Database Error",
        details: error?.detail || error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
