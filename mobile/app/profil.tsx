import { useLocalSearchParams } from "expo-router";

import { ProfileManagementScreen } from "../src/features/growth/ProfileManagementScreen";

export default function ProfilRoute() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  return <ProfileManagementScreen focus={focus} />;
}
