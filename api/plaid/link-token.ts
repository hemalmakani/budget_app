import { VercelRequest, VercelResponse } from "@vercel/node";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const config = new Configuration({
  basePath:
    PlaidEnvironments[
      (process.env.PLAID_ENV || "sandbox") as keyof typeof PlaidEnvironments
    ],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
      "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
    },
  },
});

const plaid = new PlaidApi(config);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clerkId } = req.body;
    const userId = clerkId || "demo-user";

    // Prepare link token configuration
    const linkTokenConfig: any = {
      client_name: "Legacy Mindset Budget",
      user: { client_user_id: userId },
      products: ["transactions", "auth"],
      country_codes: ["US"],
      language: "en",
    };

    // Add webhook if available
    if (process.env.PLAID_WEBHOOK_URL) {
      linkTokenConfig.webhook = process.env.PLAID_WEBHOOK_URL;
    }

    // Production mode configuration
    const isProduction = process.env.PLAID_ENV === "production";
    console.log("🔧 Plaid Environment:", process.env.PLAID_ENV);
    console.log("🔧 Is Production:", isProduction);

    if (isProduction) {
      // TEMPORARILY COMMENTED OUT - Uncomment these ONLY when app is published
      // These may cause link token creation to fail if app isn't published yet

      // linkTokenConfig.redirect_uri = "legacy-mindset-budget-tracker://oauth";
      // linkTokenConfig.android_package_name = "com.hemal.legacymindbudgettracker";
      // linkTokenConfig.ios_bundle_id = "com.hemal.legacymindbudgettracker";

      console.log(
        "⚠️ PRODUCTION MODE: App store requirements temporarily disabled for testing"
      );
    } else {
      // For development/sandbox, we can add redirect URI optionally
      if (process.env.PLAID_REDIRECT_URI) {
        linkTokenConfig.redirect_uri = process.env.PLAID_REDIRECT_URI;
      }
    }

    console.log(
      "📝 Final link token config:",
      JSON.stringify(linkTokenConfig, null, 2)
    );

    const response = await plaid.linkTokenCreate(linkTokenConfig);

    res.status(200).json({ link_token: response.data.link_token });
  } catch (err: any) {
    console.error("❌ DETAILED LINK TOKEN ERROR:");
    console.error("Full error object:", err);
    console.error("Error message:", err?.message);
    console.error("Error response data:", err?.response?.data);
    console.error("Error response status:", err?.response?.status);
    console.error("Environment variables check:");
    console.error(
      "- PLAID_CLIENT_ID:",
      process.env.PLAID_CLIENT_ID ? "✅ Set" : "❌ Missing"
    );
    console.error(
      "- PLAID_SECRET:",
      process.env.PLAID_SECRET ? "✅ Set" : "❌ Missing"
    );
    console.error("- PLAID_ENV:", process.env.PLAID_ENV);

    const errorResponse = {
      error: "Failed to create link token",
      details: err?.response?.data || err?.message || "Unknown error",
      plaidError: err?.response?.data,
      environment: process.env.PLAID_ENV,
    };

    res.status(500).json(errorResponse);
  }
}
