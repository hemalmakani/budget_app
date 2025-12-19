import { sql } from "../../lib/db";
import { PlaidService } from "../../lib/plaid";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUserId } from "../../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Actually call Plaid to create a link token
    const linkTokenResponse = await PlaidService.createLinkToken(clerkId);

    return res.status(200).json({
      link_token: linkTokenResponse.link_token,
      expiration: linkTokenResponse.expiration,
    });
  } catch (error: any) {
    console.error("Error in create link token:", error);
    return res.status(500).json({
      error: "Failed to create link token",
      details: error?.message || "Unknown error",
    });
  }
}
