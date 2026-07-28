import { clerkClient, verifyToken } from "@clerk/clerk-sdk-node";
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
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (user) {
      return user;
    }

    // Standard-Session-Tokens von Clerk enthalten KEINEN email-Claim. Vorher
    // wurde hier hart geworfen ("Cannot create user without email") und die
    // Middleware machte daraus pauschal 401 "Invalid token" – jeder Nutzer,
    // dessen Datensatz noch nicht in der DB lag (z.B. nach der Umstellung auf
    // die clerk.maitr.de-Instanz), konnte nichts Authentifiziertes tun.
    // Deshalb: E-Mail notfalls direkt bei Clerk nachschlagen.
    let resolvedEmail = email;
    if (!resolvedEmail) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      resolvedEmail =
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
    }

    if (!resolvedEmail) {
      throw new Error("Cannot create user without email");
    }

    // Instanz-Migration: Existiert die E-Mail schon unter einer alten clerkId
    // (E-Mail ist unique), den Datensatz umhängen statt an der Unique-
    // Constraint zu scheitern. Businesses/Configurations hängen an der User-id
    // und bleiben so erhalten.
    const byEmail = await prisma.user.findUnique({
      where: { email: resolvedEmail },
    });
    if (byEmail) {
      console.log(
        `[Lazy Sync] Re-linking user ${byEmail.id} (${resolvedEmail}) to new clerkId=${clerkId}`,
      );
      return await prisma.user.update({
        where: { id: byEmail.id },
        data: { clerkId },
      });
    }

    console.log(
      `[Lazy Sync] Creating new user: clerkId=${clerkId}, email=${resolvedEmail}`,
    );
    return await prisma.user.create({
      data: {
        clerkId,
        email: resolvedEmail,
        role: "OWNER",
      },
    });
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
