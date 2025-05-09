// utils/db.ts
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export async function getUserIdByClerkId(clerkId: string): Promise<number> {
  const result = await sql`
    SELECT user_id FROM users WHERE clerk_id = ${clerkId}
  `;
  if (!result.length) {
    throw new Error("User not found");
  }
  return result[0].user_id;
}
