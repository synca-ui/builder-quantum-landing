import { verifyToken } from "@clerk/clerk-sdk-node";
import prisma from "../db/prisma";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";

export interface VerifiedToken {
  sub: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
}

/**
 * Verify a Clerk session token and extract user information
 * @param token - The Clerk session token from Authorization header
 * @returns Verified token payload with sub (clerkId) and user info
 */
export async function verifyClerkToken(token: string): Promise<VerifiedToken> {
  if (!token) {
    throw new Error("Missing token");
  }

  if (!CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY not configured");
  }

  try {
    const decoded = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
    });

    if (!decoded || !decoded.sub) {
      throw new Error("Invalid token: no sub claim");
    }

    return {
      sub: decoded.sub,
      email:
        (decoded as any).email ||
        (decoded as any).emailAddresses?.[0]?.emailAddress,
      firstName: (decoded as any).firstName,
      lastName: (decoded as any).lastName,
      emailVerified: (decoded as any).emailVerified,
    };
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error("Invalid or expired token");
  }
}

/**
 * Lazy Sync: Get or create a Prisma user from Clerk ID
 * This is called on every authenticated request to ensure user exists in DB
 * @param clerkId - The Clerk user ID (sub claim from token)
 * @param email - User's email (from Clerk token)
 * @returns The Prisma User object
 */
export async function getOrCreateUser(clerkId: string, email?: string) {
  if (!clerkId) {
    throw new Error("Missing clerkId");
  }

  try {
    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (user) {
      return user;
    }

    if (!email) {
      throw new Error("Cannot create user without email");
    }

    console.log(
      `[Lazy Sync] Creating new user: clerkId=${clerkId}, email=${email}`,
    );
    user = await prisma.user.create({
      data: {
        clerkId,
        email,
        role: "OWNER",
      },
    });

    return user;
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw error;
  }
}

/**
 * Update a Prisma user with data from Clerk token
 * Called during lazy sync to ensure user data is current
 * @param clerkId - The Clerk user ID
 * @param email - User's email
 * @param firstName - User's first name
 * @param lastName - User's last name
 */
export async function syncUserFromClerk(
  clerkId: string,
  email: string,
  firstName?: string,
  lastName?: string,
) {
  if (!clerkId) {
    throw new Error("Missing clerkId");
  }

  try {
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") || undefined;

    const user = await prisma.user.update({
      where: { clerkId },
      data: {
        email,
        ...(fullName && { fullName }),
      },
    });

    return user;
  } catch (error) {
    console.error("Error syncing user from Clerk:", error);
    throw error;
  }
}
