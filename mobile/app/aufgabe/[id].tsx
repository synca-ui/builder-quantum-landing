import { useLocalSearchParams } from "expo-router";

import { ReplyEditorScreen } from "../../src/features/reviews/ReplyEditorScreen";

/** Screen 14 · Antwort bearbeiten - geöffnet aus Start-Screen und Bewertungsliste. */
export default function AufgabeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReplyEditorScreen reviewId={id} />;
}
