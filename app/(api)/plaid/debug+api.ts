import { sql } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json(
        { error: "Missing required clerkId parameter" },
        { status: 400 }
      );
    }

    // Debug: Check raw plaid_transactions data
    const rawTransactions = await sql`
      SELECT * FROM plaid_transactions WHERE clerk_id = ${clerkId} LIMIT 5
    `;

    // Debug: Check raw plaid_accounts data
    const rawAccounts = await sql`
      SELECT * FROM plaid_accounts WHERE clerk_id = ${clerkId} LIMIT 5
    `;

    // Debug: Check raw plaid_items data
    const rawItems = await sql`
      SELECT * FROM plaid_items WHERE clerk_id = ${clerkId} LIMIT 5
    `;

    // Debug: Check join query
    const joinedData = await sql`
      SELECT 
        pt.id as transaction_id,
        pt.name as transaction_name,
        pt.clerk_id as pt_clerk_id,
        pa.id as account_id,
        pa.name as account_name,
        pa.clerk_id as pa_clerk_id,
        pi.id as item_id,
        pi.institution_name,
        pi.clerk_id as pi_clerk_id
      FROM plaid_transactions pt
      LEFT JOIN plaid_accounts pa ON pt.account_id = pa.id
      LEFT JOIN plaid_items pi ON pa.item_id = pi.id
      WHERE pt.clerk_id = ${clerkId}
      LIMIT 5
    `;

    return Response.json({
      debug: true,
      clerkId,
      counts: {
        transactions: rawTransactions.length,
        accounts: rawAccounts.length,
        items: rawItems.length,
        joined: joinedData.length,
      },
      raw_transactions: rawTransactions,
      raw_accounts: rawAccounts,
      raw_items: rawItems,
      joined_data: joinedData,
    });
  } catch (error: any) {
    console.error("Debug API error:", error);
    return Response.json(
      {
        error: "Debug API failed",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
