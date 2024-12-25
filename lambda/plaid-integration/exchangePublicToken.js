const { plaidClient } = require("./config");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  try {
    const { public_token, clerkId } = JSON.parse(event.body);

    if (!public_token || !clerkId) {
      throw new Error("Missing required parameters");
    }

    // Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    });

    const accessToken = tokenResponse.data.access_token;
    const itemId = tokenResponse.data.item_id;

    // Get institution information
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });

    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: itemResponse.data.item.institution_id,
      country_codes: ["US"],
    });

    const institution = institutionResponse.data.institution;

    // Store access token and institution info in database
    await sql`
      INSERT INTO plaid_tokens (
        clerk_id, 
        access_token, 
        item_id,
        institution_id,
        institution_name,
        created_at
      ) 
      VALUES (
        ${clerkId}, 
        ${accessToken}, 
        ${itemId},
        ${institution.institution_id},
        ${institution.name},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        success: true,
        institution: {
          id: institution.institution_id,
          name: institution.name,
        },
      }),
    };
  } catch (error) {
    console.error("Error exchanging token:", error);
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
