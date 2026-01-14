import { Router } from "express";
import { clerkClient } from "@clerk/clerk-sdk-node";
import prisma from "../db/prisma";

export const usersRouter = Router();

usersRouter.get("/me", async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (e) {
    console.error("users/me error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

usersRouter.put("/profile", async (req, res) => {
  try {
    const userId = req.user!.id;
    const clerkId = req.user!.sub || req.user!.id;
    const { fullName } = req.body || {};

    // CRITICAL FIX: Update both NeonDB and Clerk simultaneously
    // Step 1: Update Prisma database
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName || null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    // Step 2: Update Clerk user object to prevent desync
    // This ensures user.reload() on the frontend gets fresh data from Clerk
    try {
      if (fullName) {
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        await clerkClient.users.updateUser(clerkId, {
          firstName: firstName,
          lastName: lastName,
        });

        console.log(
          `[Profile Sync] Updated Clerk user ${clerkId} with name: ${fullName}`,
        );
      }
    } catch (clerkError) {
      // Log the error but don't fail the request - DB update already succeeded
      console.warn(
        `[Profile Sync] Warning: Failed to update Clerk user ${clerkId}:`,
        clerkError,
      );
    }

    return res.json({ user: updated });
  } catch (e) {
    console.error("users/profile update error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});
