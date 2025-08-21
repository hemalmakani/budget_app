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
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    };

    // Add webhook if available
    if (process.env.PLAID_WEBHOOK_URL) {
      linkTokenConfig.webhook = process.env.PLAID_WEBHOOK_URL;
    }

    // Only add redirect URI for production - sandbox mode doesn't require it
    const isProduction = process.env.PLAID_ENV === "production";
    if (isProduction) {
      linkTokenConfig.redirect_uri = "legacy-mindset-budget-tracker://oauth";
      linkTokenConfig.android_package_name =
        "com.hemal.legacymindbudgettracker";
    }

    const response = await plaid.linkTokenCreate(linkTokenConfig);

    res.status(200).json({ link_token: response.data.link_token });
  } catch (err: any) {
    console.error("Error creating link token:", err);
    res.status(500).json({ error: err?.response?.data || err?.message });
  }
}
