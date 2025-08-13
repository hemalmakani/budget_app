import { PLAID_CONFIG } from "../../lib/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Just return the environment variables without making any API calls
    return res.status(200).json({
      status: "Debug endpoint working",
      config: {
        hasClientId: !!PLAID_CONFIG.CLIENT_ID,
        hasSecret: !!PLAID_CONFIG.SECRET,
        environment: PLAID_CONFIG.ENV,
        clientIdLength: PLAID_CONFIG.CLIENT_ID?.length || 0,
        secretLength: PLAID_CONFIG.SECRET?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Debug endpoint failed",
      details: error?.message || "Unknown error",
    });
  }
}
