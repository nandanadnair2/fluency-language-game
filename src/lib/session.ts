import { getServerSession } from "next-auth";
import { auth } from "./auth";

/**
 * Helper to get the current user session with type safety
 */
export async function getSession() {
  const session = await getServerSession(auth);
  return session as {
    user?: {
      id: string;
      email: string;
      name?: string | null;
      avatar?: string | null;
    };
  } | null;
}

/**
 * Helper to get the authenticated user ID
 * Returns null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user?.id;
}
