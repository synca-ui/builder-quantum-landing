// @vitest-environment node
/**
 * Lazy-Sync-Logik in getOrCreateUser.
 *
 * Anlass: Standard-Session-Tokens von Clerk tragen keinen email-Claim. Die alte
 * Implementierung warf dann "Cannot create user without email", die Middleware
 * machte daraus 401 "Invalid token" – jeder Nutzer ohne bestehenden DB-Datensatz
 * (z.B. nach der Umstellung auf die clerk.maitr.de-Instanz) konnte nicht
 * publishen. Jetzt wird die E-Mail bei Clerk nachgeschlagen und ein bestehender
 * Datensatz mit gleicher E-Mail auf die neue clerkId umgehängt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, getUserMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  getUserMock: vi.fn(),
}));

vi.mock("../db/prisma", () => ({ default: prismaMock }));
vi.mock("@clerk/clerk-sdk-node", () => ({
  clerkClient: { users: { getUser: getUserMock } },
  verifyToken: vi.fn(),
}));

import { getOrCreateUser } from "../utils/clerk";

const NEW_CLERK_ID = "user_new123";
const OLD_ROW = {
  id: "uuid-1",
  clerkId: "user_old456",
  email: "julian@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOrCreateUser", () => {
  it("liefert den bestehenden Nutzer per clerkId, ohne Clerk anzufragen", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(OLD_ROW);

    const user = await getOrCreateUser(OLD_ROW.clerkId);

    expect(user).toBe(OLD_ROW);
    expect(getUserMock).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("holt die E-Mail bei Clerk nach, wenn der Token-Claim fehlt, und legt den Nutzer an", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    getUserMock.mockResolvedValueOnce({
      primaryEmailAddressId: "idn_1",
      emailAddresses: [
        { id: "idn_2", emailAddress: "zweit@example.com" },
        { id: "idn_1", emailAddress: "primaer@example.com" },
      ],
    });
    prismaMock.user.create.mockImplementationOnce(async ({ data }: any) => data);

    const user = await getOrCreateUser(NEW_CLERK_ID); // kein email-Claim

    expect(getUserMock).toHaveBeenCalledWith(NEW_CLERK_ID);
    expect(user).toMatchObject({
      clerkId: NEW_CLERK_ID,
      email: "primaer@example.com", // die primäre, nicht die erste
    });
  });

  it("hängt bei bekannter E-Mail den bestehenden Datensatz auf die neue clerkId um (Instanz-Migration)", async () => {
    // 1. Lookup per clerkId: nichts. 2. Lookup per E-Mail: alter Datensatz.
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(OLD_ROW);
    prismaMock.user.update.mockImplementationOnce(
      async ({ where, data }: any) => ({ ...OLD_ROW, ...where, ...data }),
    );

    const user = await getOrCreateUser(NEW_CLERK_ID, OLD_ROW.email);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: OLD_ROW.id },
      data: { clerkId: NEW_CLERK_ID },
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(user.clerkId).toBe(NEW_CLERK_ID);
  });

  it("wirft weiterhin, wenn auch Clerk keine E-Mail kennt", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    getUserMock.mockResolvedValueOnce({
      primaryEmailAddressId: null,
      emailAddresses: [],
    });

    await expect(getOrCreateUser(NEW_CLERK_ID)).rejects.toThrow(
      "Cannot create user without email",
    );
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
