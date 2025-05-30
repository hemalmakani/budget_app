import { PlaidService } from "../../lib/plaid";
import { sql } from "../../lib/db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { clerkId } = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: "Missing required clerkId" });
    }

    // Verify user exists
    const userResult = await sql`
      SELECT clerk_id FROM users WHERE clerk_id = ${clerkId}
    `;

    if (!userResult.length) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create link token using clerkId directly
    const linkTokenResponse = await PlaidService.createLinkToken(clerkId);

    return res.status(200).json({
      link_token: linkTokenResponse.link_token,
      expiration: linkTokenResponse.expiration,
    });
  } catch (error: any) {
    console.error("Error creating link token:", error);
    return res.status(500).json({
      error: "Failed to create link token",
      details: error?.message || "Unknown error",
    });
  }
}
