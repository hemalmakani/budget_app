const { plaidClient } = require("./config");

exports.handler = async (event) => {
  try {
    // Parse the incoming request body if needed
    const body = event.body ? JSON.parse(event.body) : {};

    // You might want to get the user ID from the event context or request
    const userId = body.userId || "default-user";

    const request = {
      user: { client_user_id: userId },
      client_name: "Budget App",
      products: ["auth", "transactions"],
      country_codes: ["US"],
      language: "en",
      redirect_uri: process.env.PLAID_REDIRECT_URI,
    };

    console.log("Creating link token with request:", request);
    const response = await plaidClient.linkTokenCreate(request);
    console.log("Link token response:", response.data);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        link_token: response.data.link_token,
      }),
    };
  } catch (error) {
    console.error("Error creating link token:", error);
    console.error("Error details:", error.response?.data);

    return {
      statusCode: error.response?.status || 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        error: error.response?.data?.error_message || error.message,
        details: error.response?.data,
      }),
    };
  }
};
