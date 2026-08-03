import { useLocalSearchParams } from "expo-router";

import { PostEditorScreen } from "../../src/features/posts/PostEditorScreen";

export default function BeitragRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PostEditorScreen postId={id} />;
}
