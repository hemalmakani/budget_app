import { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    console.log("Fetching user with clerk_id:", id);

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "User ID is required" });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT name, email
      FROM users
      WHERE clerk_id = ${id}
    `;

    console.log("Database response:", response);

    if (!response || response.length === 0) {
      console.log("No user found for clerk_id:", id);
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ data: response[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
