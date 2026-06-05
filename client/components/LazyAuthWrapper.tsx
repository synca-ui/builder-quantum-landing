/**
 * LazyAuthWrapper.tsx
 *
 * Previously wrapped auth routes in their own ClerkProvider.
 * Now that ClerkProvider lives at the App root (App.tsx), this component
 * is a simple passthrough — kept for potential future middleware logic.
 */
import { Outlet } from "react-router-dom";

export default function LazyAuthWrapper() {
  return <Outlet />;
}
