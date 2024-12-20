import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  try {
    console.log("Fetching user with clerk_id:", id);

    if (!id) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
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
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ data: response[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
