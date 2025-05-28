import { neon } from "@neondatabase/serverless";
import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { name, email, clerkId } = req.body;

    if (!name || !email || !clerkId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await sql`
      INSERT INTO users (
        name, 
        email, 
        clerk_id
      ) 
      VALUES (
        ${name}, 
        ${email},
        ${clerkId}
     );`;

    return res.status(201).json({ data: response });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
