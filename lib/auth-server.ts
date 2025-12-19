import { verifyToken } from '@clerk/backend';
import { VercelRequest } from '@vercel/node';

/**
 * Extracts and verifies the JWT token from the Authorization header.
 * Returns the authenticated user's clerkId or null if invalid/not present.
 */
export async function getAuthenticatedUserId(req: VercelRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.slice(7);
    
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    
    // payload.sub is the clerk user ID
    return payload.sub;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

