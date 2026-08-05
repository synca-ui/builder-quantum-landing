import { Pressable, StyleSheet, View } from "react-native";

import { MaitrWordmark } from "../../../components/MaitrWordmark";
import { BellIcon, MoonIcon } from "../../../components/icons";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { Emphasis, Text } from "../../../components/ui/Text";
import { useTheme } from "../../../theme";

export interface GreetingHeaderProps {
  dateLabel: string;
  greeting: string;
  venueName: string;
  subline: string;
  /** Ungelesene Posteingangs-Nachrichten - Badge auf der Glocke. */
  unread?: number;
  onOpenInbox?: () => void;
  onToggleNightMode?: () => void;
}

/** Kopfbereich von Screen 04: Wortmarke, Schnellaktionen, Begrüßung. */
export function GreetingHeader({
  dateLabel,
  greeting,
  venueName,
  subline,
  unread = 0,
  onOpenInbox,
  onToggleNightMode,
}: GreetingHeaderProps) {
  const theme = useTheme();

  const circle = {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  } as const;

  return (
    // Markenleiste als eigene Ebene; MITTWOCH sitzt etwas höher (23 statt 26 - der
    // 40px-Kreisleisten-Overhang addiert visuell noch ein paar px dazu).
    <View style={{ gap: 23 }}>
      <View style={styles.topRow}>
        <MaitrWordmark size={26} />
        <View style={styles.actions}>
          <Pressable
            onPress={onOpenInbox}
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0 ? `Posteingang, ${unread} ungelesen` : "Posteingang"
            }
            hitSlop={8}
            style={({ pressed }) => [circle, { opacity: pressed ? 0.7 : 1 }]}
          >
            <BellIcon size={18} color={theme.colors.textPrimary} />
            {unread > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text variant="eyebrow" color={theme.colors.onPrimary} style={styles.badgeText}>
                  {unread}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={onToggleNightMode}
            accessibilityRole="button"
            accessibilityLabel="Nachtbar Modus umschalten"
            hitSlop={8}
            style={({ pressed }) => [circle, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MoonIcon size={18} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View>
        <Eyebrow variant="eyebrowLg">{dateLabel}</Eyebrow>
        {/* Dachzeile klebt bewusst nah an der Überschrift (6-8 px). */}
        {/* Begrüßung und Betriebsname bilden eine Überschrift - daher ein Textknoten. */}
        <Text variant="screenTitle" accessibilityRole="header" style={{ marginTop: 7 }}>
          {greeting}
          {"\n"}
          <Emphasis variant="screenTitle">{venueName}</Emphasis>
        </Text>
        <Text variant="body" tone="secondary" style={[styles.subline, { marginTop: 10 }]}>
          {subline}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 0,
    textTransform: "none",
  },
  subline: {
    fontSize: 15.5,
    lineHeight: 20,
  },
});
