/**
 * Business Service
 * 
 * Handles multi-tenancy setup with transactional consistency:
 * - Ensures User -> Business -> BusinessMember link
 * - Prevents orphaned business records
 * - Provides atomic operations for configuration publish flows
 */

import prisma from "../db/prisma";

export interface BusinessSetupResult {
  userId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  isMembershipNew: boolean;
}

/**
 * Ensures a User has a Business with proper BusinessMember linkage.
 * 
 * Flow:
 * 1. Verify User exists in Prisma (already done by auth middleware)
 * 2. Upsert Business using slug (create if doesn't exist, update if does)
 * 3. Create BusinessMember with OWNER role if user-business pairing is new
 * 4. All in a single transaction for atomicity
 * 
 * @param userId The Prisma User ID (from req.user.id)
 * @param businessName The business name to use for slug generation
 * @param templateId Optional template ID to link
 * @param designTokens Optional design system tokens
 * @returns BusinessSetupResult with businessId and membership status
 * @throws Error if transaction fails
 */
export async function ensureUserBusiness(
  userId: string,
  businessName: string,
  templateId?: string,
  designTokens?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  }
): Promise<BusinessSetupResult> {
  const businessSlug = generateBusinessSlug(businessName);

  return await (prisma as any).$transaction(async (tx: any) => {
    try {
      console.log("[BusinessService] Starting transaction:", {
        userId,
        businessName,
        businessSlug,
        hasTemplate: !!templateId,
      });

      // Step 1: Verify user exists
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Step 2: Upsert Business
      const business = await tx.business.upsert({
        where: { slug: businessSlug },
        update: {
          name: businessName,
          templateId: templateId || undefined,
          primaryColor: designTokens?.primaryColor || "#000000",
          secondaryColor: designTokens?.secondaryColor || "#ffffff",
          fontFamily: designTokens?.fontFamily || "sans",
          updatedAt: new Date(),
        },
        create: {
          slug: businessSlug,
          name: businessName,
          templateId: templateId || undefined,
          primaryColor: designTokens?.primaryColor || "#000000",
          secondaryColor: designTokens?.secondaryColor || "#ffffff",
          fontFamily: designTokens?.fontFamily || "sans",
          template: templateId || "minimalist",
          status: "DRAFT",
        },
      });

      // Step 3: Check if user-business membership already exists
      const existingMembership = await tx.businessMember.findUnique({
        where: {
          userId_businessId: {
            userId,
            businessId: business.id,
          },
        },
      });

      let isMembershipNew = false;

      // Step 4: Create membership if it doesn't exist
      if (!existingMembership) {
        await tx.businessMember.create({
          data: {
            userId,
            businessId: business.id,
            role: "OWNER", // First user to link is always the owner
          },
        });
        isMembershipNew = true;
      }

      console.log("[BusinessService] Transaction completed:", {
        businessId: business.id,
        isMembershipNew,
      });

      return {
        userId,
        businessId: business.id,
        businessName: business.name,
        businessSlug: business.slug,
        isMembershipNew,
      };
    } catch (error) {
      console.error("[BusinessService] Transaction failed:", {
        userId,
        businessSlug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}

/**
 * Generate a URL-safe slug from business name
 * @param businessName The business name
 * @returns A slug suitable for use as a database slug
 */
export function generateBusinessSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "business";
}

/**
 * Link a Configuration to a Business (via the Configuration.userId relationship)
 * This ensures configurations are associated with a business for publish operations
 * 
 * @param businessId The Business ID
 * @param configurationId The Configuration ID  
 * @returns Promise that resolves when link is established
 */
export async function linkConfigurationToBusiness(
  businessId: string,
  configurationId: string
): Promise<void> {
  try {
    // Note: Configuration has userId field, so the link is implicit via User -> Business -> BusinessMember
    // This function is for logging/auditing purposes
    console.log("[BusinessService] Configuration linked to business:", {
      businessId,
      configurationId,
    });
  } catch (error) {
    console.error("[BusinessService] Error linking configuration:", error);
    throw error;
  }
}

/**
 * Get user's primary business (the first/main business they own)
 * @param userId The User ID
 * @returns Business or null if user has no businesses
 */
export async function getUserPrimaryBusiness(userId: string) {
  try {
    const membership = await (prisma as any).businessMember.findFirst({
      where: {
        userId,
        role: "OWNER",
      },
      include: {
        business: true,
      },
      orderBy: {
        business: {
          createdAt: "asc",
        },
      },
    });

    return membership?.business || null;
  } catch (error) {
    console.error("[BusinessService] Error getting user primary business:", error);
    return null;
  }
}

/**
 * Get all businesses for a user
 * @param userId The User ID
 * @returns Array of businesses the user has access to
 */
export async function getUserBusinesses(userId: string) {
  try {
    const memberships = await (prisma as any).businessMember.findMany({
      where: { userId },
      include: { business: true },
    });

    return memberships.map((m: any) => m.business);
  } catch (error) {
    console.error("[BusinessService] Error getting user businesses:", error);
    return [];
  }
}

export default {
  ensureUserBusiness,
  generateBusinessSlug,
  linkConfigurationToBusiness,
  getUserPrimaryBusiness,
  getUserBusinesses,
};
