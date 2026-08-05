import { useLocalSearchParams } from "expo-router";

import { MetricDetailScreen } from "../../src/features/growth/MetricDetailScreen";

export default function KennzahlRoute() {
  const { key } = useLocalSearchParams<{ key: string }>();
  return <MetricDetailScreen metricKey={key} />;
}
