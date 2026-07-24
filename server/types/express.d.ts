// server/types/express.d.ts
// Zentrale Express Request-Augmentierung (nicht in einzelnen Route-Dateien verteilen)

import type { AuthUser } from "../middleware/auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userId?: string;
    }
  }
}

export {};
