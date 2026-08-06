import { useLocalSearchParams } from "expo-router";

import { StampCardDetailScreen } from "../../src/features/loyalty/StampCardDetailScreen";

export default function StempelkarteDetailRoute() {
  const { kartenId } = useLocalSearchParams<{ kartenId: string }>();
  return <StampCardDetailScreen kartenId={kartenId} />;
}
