const { plaidClient } = require("./config");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  try {
    const { public_token, userId } = JSON.parse(event.body);

    if (!public_token) {
      throw new Error("Missing public_token in request body");
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Store the access token in PostgreSQL using neon
    const result = await sql`
      INSERT INTO plaid_tokens (user_id, access_token, item_id, created_at, updated_at)
      VALUES (${userId}, ${accessToken}, ${itemId}, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        item_id = EXCLUDED.item_id,
        updated_at = NOW()
      RETURNING *
    `;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Update this in production
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        success: true,
        itemId: itemId,
      }),
    };
  } catch (error) {
    console.error("Error exchanging public token:", error);
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
