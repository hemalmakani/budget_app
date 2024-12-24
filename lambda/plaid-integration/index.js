const createLinkToken = require("./createLinkToken");
const exchangePublicToken = require("./exchangePublicToken");
const getAccountData = require("./getAccountData");

exports.handler = async (event) => {
  try {
    // Get the path from API Gateway event
    const path = event.path || event.resource;

    // Route to the appropriate handler based on the path
    switch (path) {
      case "/plaid/create-link-token":
        return await createLinkToken.handler(event);

      case "/plaid/exchange-token":
        return await exchangePublicToken.handler(event);

      case "/plaid/accounts":
        return await getAccountData.handler(event);

      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Not Found" }),
        };
    }
  } catch (error) {
    console.error("Error in main handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
