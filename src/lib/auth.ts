import { supabase } from './supabase';

/**
 * Extracts the JWT from the Authorization header and verifies it with Supabase.
 * Returns the user object if authenticated, or null otherwise.
 */
export async function verifyUser(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7).trim(); // Remove 'Bearer '
    if (!token) {
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.warn('Auth verification failed:', error?.message);
      return null;
    }

    return user;
  } catch (err) {
    console.error('Unexpected error during user verification:', err);
    return null;
  }
}
