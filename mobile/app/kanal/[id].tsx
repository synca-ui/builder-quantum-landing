import { useLocalSearchParams } from "expo-router";

import { ChannelDetailScreen } from "../../src/features/growth/ChannelDetailScreen";

export default function KanalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChannelDetailScreen channelId={id} />;
}
