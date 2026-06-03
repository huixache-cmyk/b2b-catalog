import { supabase } from './supabase';

/**
 * Extracts the JWT from the Authorization header and verifies it with Supabase.
 * Returns the user object if authenticated, or null otherwise.
 */
export async function verifyUser(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log("verifyUser - Authorization Header:", authHeader ? `${authHeader.substring(0, 25)}... (len=${authHeader.length})` : 'null');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7).trim(); // Remove 'Bearer '
    if (!token) {
      console.warn("verifyUser - Token is empty after trimming");
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.warn('Auth verification failed. Error:', error?.message);
      return null;
    }

    return user;
  } catch (err) {
    console.error('Unexpected error during user verification:', err);
    return null;
  }
}
