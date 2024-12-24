const { plaidClient } = require("./config");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  try {
    const { userId } = event.queryStringParameters || {};

    if (!userId) {
      throw new Error("Missing userId in query parameters");
    }

    // Get access token from PostgreSQL using neon
    const tokens = await sql`
      SELECT access_token 
      FROM plaid_tokens 
      WHERE user_id = ${userId}
    `;

    if (tokens.length === 0) {
      throw new Error("No access token found for user");
    }

    const accessToken = tokens[0].access_token;

    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    // Get transactions for the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Update this in production
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        accounts: accountsResponse.data.accounts,
        transactions: transactionsResponse.data.transactions,
      }),
    };
  } catch (error) {
    console.error("Error getting account data:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // Update this in production
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
