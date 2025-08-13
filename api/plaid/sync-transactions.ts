import { PlaidService, PlaidDataTransformer } from "../../lib/plaid";
import { sql } from "../../lib/db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clerkId, startDate, endDate } = req.body;

    if (!clerkId) {
      return res.status(400).json({
        error: "Missing required clerkId",
      });
    }

    // Verify user exists
    const userResult = await sql`
      SELECT user_id FROM users WHERE clerk_id = ${clerkId}
    `;

    if (!userResult.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult[0].user_id;

    // Get user's active Plaid items
    const itemsResult = await sql`
      SELECT id, access_token, item_id, institution_name
      FROM plaid_items 
      WHERE user_id = ${userId} AND access_token IS NOT NULL
    `;

    if (!itemsResult.length) {
      return res
        .status(404)
        .json({ error: "No connected bank accounts found" });
    }

    let totalTransactions = 0;
    let newTransactions = 0;
    let errors = [];

    // Use default date range if not provided (last 30 days)
    const end = endDate || new Date().toISOString().split("T")[0];
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    for (const item of itemsResult) {
      try {
        // Get accounts for this item
        const accountsResult = await sql`
          SELECT id, account_id, name
          FROM plaid_accounts 
          WHERE item_id = ${item.id} AND is_active = true
        `;

        for (const account of accountsResult) {
          try {
            // Fetch transactions from Plaid
            const transactionsResponse = await PlaidService.getTransactions(
              item.access_token,
              start,
              end,
              500, // count
              0 // offset
            );

            const plaidTransactions = transactionsResponse.transactions;
            totalTransactions += plaidTransactions.length;

            // Process each transaction
            for (const plaidTransaction of plaidTransactions) {
              try {
                // Check if transaction already exists
                const existingTransaction = await sql`
                  SELECT id FROM plaid_transactions 
                  WHERE transaction_id = ${plaidTransaction.transaction_id}
                `;

                if (existingTransaction.length === 0) {
                  // Transform and store new transaction
                  const transformedTransaction =
                    PlaidDataTransformer.transformTransaction(
                      plaidTransaction,
                      account.id,
                      clerkId
                    );

                  await sql`
                    INSERT INTO plaid_transactions (
                      transaction_id, account_id, name, merchant_name, amount, 
                      date, category, subcategory, plaid_category_id, 
                      transaction_type, pending, iso_currency_code, 
                      location, clerk_id, is_synced_to_transactions
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
                      ${transformedTransaction.clerk_id},
                      ${transformedTransaction.is_synced_to_transactions}
                    )
                  `;

                  newTransactions++;

                  // Optionally auto-create transaction in main transactions table
                  if (transformedTransaction.amount > 0) {
                    // Only expenses
                    const localCategory =
                      PlaidDataTransformer.mapToLocalCategory(
                        transformedTransaction.category,
                        transformedTransaction.subcategory
                      );

                    await sql`
                      INSERT INTO transactions (
                        name, category_name, amount, created_at, type, clerk_id
                      )
                      VALUES (
                        ${transformedTransaction.name},
                        ${localCategory},
                        ${transformedTransaction.amount},
                        ${transformedTransaction.date}::timestamp,
                        'expense',
                        ${clerkId}
                      )
                    `;

                    // Mark as synced
                    await sql`
                      UPDATE plaid_transactions 
                      SET is_synced_to_transactions = true
                      WHERE transaction_id = ${transformedTransaction.transaction_id}
                    `;
                  }
                }
              } catch (txError: any) {
                console.error("Error processing transaction:", txError);
                errors.push(
                  `Transaction ${plaidTransaction.transaction_id}: ${txError?.message || "Unknown error"}`
                );
              }
            }

            // Update account balances
            const balancesResponse = await PlaidService.getAccountBalances(
              item.access_token
            );
            const accountBalance = balancesResponse.accounts.find(
              (acc: any) => acc.account_id === account.account_id
            );

            if (accountBalance) {
              await sql`
                UPDATE plaid_accounts 
                SET 
                  current_balance = ${accountBalance.balances.current},
                  available_balance = ${accountBalance.balances.available},
                  last_balance_update = CURRENT_TIMESTAMP
                WHERE id = ${account.id}
              `;
            }
          } catch (accountError: any) {
            console.error("Error processing account:", accountError);
            errors.push(
              `Account ${account.name}: ${accountError?.message || "Unknown error"}`
            );
          }
        }
      } catch (itemError: any) {
        console.error("Error processing item:", itemError);
        errors.push(
          `Item ${item.institution_name}: ${itemError?.message || "Unknown error"}`
        );
      }
    }

    // Update sync status
    await sql`
      INSERT INTO plaid_sync_status (clerk_id, sync_status, transactions_synced_count, last_sync_timestamp)
      VALUES (${clerkId}, 'success', ${newTransactions}, CURRENT_TIMESTAMP)
      ON CONFLICT (clerk_id) DO UPDATE SET
        sync_status = 'success',
        transactions_synced_count = plaid_sync_status.transactions_synced_count + ${newTransactions},
        last_sync_timestamp = CURRENT_TIMESTAMP
    `;

    return res.status(200).json({
      success: true,
      summary: {
        total_transactions_processed: totalTransactions,
        new_transactions_added: newTransactions,
        errors: errors.length,
        error_details: errors.slice(0, 5), // Return first 5 errors
      },
      message: `Successfully synced ${newTransactions} new transactions`,
    });
  } catch (error: any) {
    console.error("Error syncing transactions:", error);

    // Log error in sync status
    try {
      const { clerkId } = req.body;
      if (clerkId) {
        await sql`
          INSERT INTO plaid_sync_status (clerk_id, sync_status, error_message, last_sync_timestamp)
          VALUES (${clerkId}, 'error', ${error?.message || "Unknown error"}, CURRENT_TIMESTAMP)
          ON CONFLICT (clerk_id) DO UPDATE SET
            sync_status = 'error',
            error_message = ${error?.message || "Unknown error"},
            last_sync_timestamp = CURRENT_TIMESTAMP
        `;
      }
    } catch (logError) {
      console.error("Error logging sync status:", logError);
    }

    return res.status(500).json({
      error: "Failed to sync transactions",
      details: error?.message || "Unknown error",
    });
  }
}
