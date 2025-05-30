import { PlaidService, PlaidDataTransformer } from "../../../lib/plaid";
import { sql } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const accountId = url.searchParams.get("accountId");
    const category = url.searchParams.get("category");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!clerkId) {
      return Response.json(
        { error: "Missing required clerkId parameter" },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Build query conditions
    let whereConditions = `u.clerk_id = ${clerkId}`;
    const queryParams = [clerkId];

    if (accountId) {
      whereConditions += ` AND pt.account_id = $${queryParams.length + 1}`;
      queryParams.push(accountId);
    }

    if (category) {
      whereConditions += ` AND pt.category ILIKE $${queryParams.length + 1}`;
      queryParams.push(`%${category}%`);
    }

    if (startDate) {
      whereConditions += ` AND pt.date >= $${queryParams.length + 1}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions += ` AND pt.date <= $${queryParams.length + 1}`;
      queryParams.push(endDate);
    }

    // Get transactions with pagination
    const transactionsResult = await sql`
      SELECT 
        pt.id,
        pt.transaction_id,
        pt.name,
        pt.merchant_name,
        pt.amount,
        pt.date,
        pt.category,
        pt.subcategory,
        pt.transaction_type,
        pt.pending,
        pt.is_synced_to_transactions,
        pt.location,
        pa.name as account_name,
        pa.type as account_type,
        pi.institution_name,
        ROW_NUMBER() OVER (ORDER BY pt.date DESC) as row_num
      FROM plaid_transactions pt
      JOIN plaid_accounts pa ON pt.account_id = pa.id
      JOIN plaid_items pi ON pa.item_id = pi.id
      JOIN users u ON pt.user_id = u.user_id
      WHERE u.clerk_id = ${clerkId}
      ${accountId ? sql`AND pt.account_id = ${accountId}` : sql``}
      ${category ? sql`AND pt.category ILIKE ${`%${category}%`}` : sql``}
      ${startDate ? sql`AND pt.date >= ${startDate}` : sql``}
      ${endDate ? sql`AND pt.date <= ${endDate}` : sql``}
      ORDER BY pt.date DESC, pt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM plaid_transactions pt
      JOIN plaid_accounts pa ON pt.account_id = pa.id
      JOIN plaid_items pi ON pa.item_id = pi.id
      JOIN users u ON pt.user_id = u.user_id
      WHERE u.clerk_id = ${clerkId}
      ${accountId ? sql`AND pt.account_id = ${accountId}` : sql``}
      ${category ? sql`AND pt.category ILIKE ${`%${category}%`}` : sql``}
      ${startDate ? sql`AND pt.date >= ${startDate}` : sql``}
      ${endDate ? sql`AND pt.date <= ${endDate}` : sql``}
    `;

    const totalTransactions = parseInt(countResult[0].total);
    const totalPages = Math.ceil(totalTransactions / limit);

    const transactions = transactionsResult.map((transaction) => ({
      id: transaction.id,
      transaction_id: transaction.transaction_id,
      name: transaction.name,
      merchant_name: transaction.merchant_name,
      amount: parseFloat(transaction.amount),
      date: transaction.date,
      category: transaction.category,
      subcategory: transaction.subcategory,
      transaction_type: transaction.transaction_type,
      pending: transaction.pending,
      is_synced_to_transactions: transaction.is_synced_to_transactions,
      location: transaction.location ? JSON.parse(transaction.location) : null,
      account_name: transaction.account_name,
      account_type: transaction.account_type,
      institution_name: transaction.institution_name,
    }));

    return Response.json({
      transactions,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_transactions: totalTransactions,
        limit,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return Response.json(
      {
        error: "Failed to fetch transactions",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clerkId, days = 30 } = body;

    if (!clerkId) {
      return Response.json(
        { error: "Missing required clerkId" },
        { status: 400 }
      );
    }

    // Update sync status
    await sql`
      INSERT INTO plaid_sync_status (clerk_id, sync_status)
      VALUES (${clerkId}, 'in_progress')
      ON CONFLICT (clerk_id) DO UPDATE SET
        sync_status = 'in_progress',
        last_sync_timestamp = CURRENT_TIMESTAMP
    `;

    // Calculate date range
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get all user's Plaid items and accounts
    const accountsResult = await sql`
      SELECT 
        pa.id as account_db_id,
        pa.account_id as plaid_account_id,
        pi.access_token,
        pi.id as item_id,
        u.user_id
      FROM plaid_accounts pa
      JOIN plaid_items pi ON pa.item_id = pi.id
      JOIN users u ON pa.user_id = u.user_id
      WHERE u.clerk_id = ${clerkId} AND pa.is_active = true
    `;

    let totalSynced = 0;
    const errors = [];

    // Sync transactions for each account
    for (const account of accountsResult) {
      try {
        const transactionsResponse = await PlaidService.getTransactions(
          account.access_token,
          startDate,
          endDate
        );

        for (const plaidTransaction of transactionsResponse.transactions) {
          // Check if transaction already exists
          const existingTransaction = await sql`
            SELECT id FROM plaid_transactions 
            WHERE transaction_id = ${plaidTransaction.transaction_id}
          `;

          if (existingTransaction.length === 0) {
            const transformedTransaction =
              PlaidDataTransformer.transformTransaction(
                plaidTransaction,
                account.account_db_id,
                account.user_id
              );

            await sql`
              INSERT INTO plaid_transactions (
                transaction_id, account_id, name, merchant_name, amount, date,
                category, subcategory, plaid_category_id, transaction_type,
                pending, iso_currency_code, location, user_id, is_synced_to_transactions,
                created_at
              )
              VALUES (
                ${transformedTransaction.transaction_id},
                ${transformedTransaction.account_id},
                ${transformedTransaction.name},
                ${transformedTransaction.merchant_name},
                ${transformedTransaction.amount},
                ${transformedTransaction.date},
                ${transformedTransaction.category},
                ${transformedTransaction.subcategory},
                ${transformedTransaction.plaid_category_id},
                ${transformedTransaction.transaction_type},
                ${transformedTransaction.pending},
                ${transformedTransaction.iso_currency_code},
                ${transformedTransaction.location},
                ${transformedTransaction.user_id},
                ${transformedTransaction.is_synced_to_transactions},
                CURRENT_TIMESTAMP
              )
            `;
            totalSynced++;
          }
        }
      } catch (error: any) {
        console.error(
          `Error syncing transactions for account ${account.account_db_id}:`,
          error
        );
        errors.push({
          account_id: account.account_db_id,
          error: error?.message || "Unknown error",
        });
      }
    }

    // Update sync status
    const finalStatus = errors.length > 0 ? "error" : "success";
    const errorMessage = errors.length > 0 ? JSON.stringify(errors) : null;

    await sql`
      UPDATE plaid_sync_status 
      SET 
        sync_status = ${finalStatus},
        error_message = ${errorMessage},
        transactions_synced_count = ${totalSynced},
        last_sync_timestamp = CURRENT_TIMESTAMP
      WHERE clerk_id = ${clerkId}
    `;

    return Response.json({
      success: true,
      transactions_synced: totalSynced,
      date_range: { start_date: startDate, end_date: endDate },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error syncing transactions:", error);

    // Update sync status with error
    try {
      const { clerkId } = await request.json();
      if (clerkId) {
        await sql`
          UPDATE plaid_sync_status 
          SET sync_status = 'error', error_message = ${error?.message || "Unknown error"}
          WHERE clerk_id = ${clerkId}
        `;
      }
    } catch (logError) {
      console.error("Error updating sync status:", logError);
    }

    return Response.json(
      {
        error: "Failed to sync transactions",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
