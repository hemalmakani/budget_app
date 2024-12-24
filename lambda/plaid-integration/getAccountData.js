const { plaidClient } = require("./config");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  try {
    const { clerkId } = event.queryStringParameters || {};

    if (!clerkId) {
      throw new Error("Missing clerkId in query parameters");
    }

    console.log("Getting access token for clerkId:", clerkId);

    // Get access token from PostgreSQL using neon
    const tokens = await sql`
      SELECT access_token 
      FROM plaid_tokens 
      WHERE clerk_id = ${clerkId}
    `;

    if (tokens.length === 0) {
      throw new Error("No access token found for user");
    }

    const accessToken = tokens[0].access_token;
    console.log("Found access token");

    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    console.log("Got accounts:", accountsResponse.data.accounts.length);

    // Get transactions for the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    console.log("Fetching transactions from", startDate, "to", endDate);

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      options: {
        include_personal_finance_category: true,
        include_original_description: true,
      },
    });

    console.log(
      "Got transactions:",
      transactionsResponse.data.transactions.length,
    );

    // Log first transaction as sample
    if (transactionsResponse.data.transactions.length > 0) {
      console.log(
        "Sample transaction data:",
        JSON.stringify(transactionsResponse.data.transactions[0], null, 2),
      );
    }

    // Store transactions in the database
    const transactions = transactionsResponse.data.transactions;
    console.log("Storing transactions in database...");

    for (const transaction of transactions) {
      console.log("Processing transaction:", {
        id: transaction.transaction_id,
        name: transaction.name,
        amount: transaction.amount,
        date: transaction.date,
        category: transaction.personal_finance_category?.primary,
        account_id: transaction.account_id,
      });

      try {
        const result = await sql`
          INSERT INTO plaid_transactions (
            clerk_id,
            plaid_transaction_id,
            account_id,
            name,
            amount,
            date,
            category,
            category_id,
            created_at
          )
          VALUES (
            ${clerkId},
            ${transaction.transaction_id},
            ${transaction.account_id},
            ${transaction.name},
            ${transaction.amount},
            ${transaction.date},
            ${transaction.personal_finance_category?.primary || null},
            ${transaction.personal_finance_category?.detailed || null},
            NOW()
          )
          ON CONFLICT (plaid_transaction_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            amount = EXCLUDED.amount,
            category = EXCLUDED.category,
            category_id = EXCLUDED.category_id,
            updated_at = NOW()
          RETURNING id
        `;
        console.log(
          "Successfully stored transaction:",
          transaction.transaction_id,
          "with DB id:",
          result[0].id,
        );
      } catch (error) {
        console.error(
          "Error storing transaction:",
          transaction.transaction_id,
          error.message || error,
        );
      }
    }

    console.log("Finished storing transactions");

    // Get balances
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        accounts: accountsResponse.data.accounts,
        transactions: transactionsResponse.data.transactions,
        balances: balanceResponse.data.accounts,
      }),
    };
  } catch (error) {
    console.error("Error getting account data:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
