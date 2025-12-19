import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify JWT and get authenticated user
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("Fetching user with verified clerk_id:", clerkId);

    const sql = neon(`${process.env.DATABASE_URL}`);
    // 2. Use verified clerkId - users can only view their own data
    const response = await sql`
      SELECT name, email
      FROM users
      WHERE clerk_id = ${clerkId}
    `;

    console.log("Database response:", response);

    if (!response || response.length === 0) {
      console.log("No user found for clerk_id:", clerkId);
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ data: response[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
