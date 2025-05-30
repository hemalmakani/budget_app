import { PlaidService } from "../../../lib/plaid";
import { sql } from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clerkId } = body;

    if (!clerkId) {
      return Response.json(
        { error: "Missing required clerkId" },
        { status: 400 }
      );
    }

    // Verify user exists
    const userResult = await sql`
      SELECT clerk_id FROM users WHERE clerk_id = ${clerkId}
    `;

    if (!userResult.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Create link token using clerkId directly
    const linkTokenResponse = await PlaidService.createLinkToken(clerkId);

    return Response.json({
      link_token: linkTokenResponse.link_token,
      expiration: linkTokenResponse.expiration,
    });
  } catch (error: any) {
    console.error("Error creating link token:", error);
    return Response.json(
      {
        error: "Failed to create link token",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
