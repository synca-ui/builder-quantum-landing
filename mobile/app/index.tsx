import { Redirect } from "expo-router";

import { useStore } from "../src/lib/store";

/**
 * Einstiegspunkt. Wer angemeldet ist, landet im Start-Screen; alle anderen im Login.
 * Das ist die einzige Weiche der App - jede weitere Navigation läuft über den Router.
 */
export default function Index() {
  const { signedIn } = useStore();
  return <Redirect href={signedIn ? "/start" : "/login"} />;
}
