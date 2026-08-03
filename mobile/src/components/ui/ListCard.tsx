import { Children, Fragment, type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";

import { useTheme } from "../../theme";
import { Text } from "./Text";

/**
 * Karte mit Trennlinien zwischen den Zeilen - im Design das Muster für Kanäle,
 * Öffnungszeiten, Journey-Checklisten und Konto-Einstellungen.
 *
 * Die Linien setzt der Container, nicht die Zeile: so bleibt die letzte Zeile
 * automatisch linienfrei, egal wie viele Kinder kommen.
 */
export function ListCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.card,
          paddingHorizontal: theme.spacing.xl,
        },
        theme.elevation.card,
        style,
      ]}
    >
      {rows.map((row, index) => (
        <Fragment key={index}>
          {row}
          {index < rows.length - 1 ? (
            <View style={{ height: 1, backgroundColor: theme.colors.surfaceSunken }} />
          ) : null}
        </Fragment>
      ))}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  /** Kleingeschriebene Zusatzzeile unter dem Titel. */
  meta?: string;
  /** Element links, z. B. ein Avatar oder ein Häkchen-Kreis. */
  leading?: ReactNode;
  /** Element rechts, z. B. Toggle, Status oder Button. */
  trailing?: ReactNode;
  /** Rechtsbündiger Wert statt `trailing` - für Öffnungszeiten. */
  value?: string;
  /** Erledigt: durchgestrichen und ausgegraut. */
  done?: boolean;
  onPress?: () => void;
}

export function ListRow({
  title,
  meta,
  leading,
  trailing,
  value,
  done = false,
  onPress,
}: ListRowProps) {
  const theme = useTheme();

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 15,
        minHeight: theme.hitSize.minTouch,
      }}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <Text
          variant="cardTitleSm"
          tone={done ? "faint" : "primary"}
          style={{ fontSize: 16.5, textDecorationLine: done ? "line-through" : "none" }}
        >
          {title}
        </Text>
        {meta ? (
          <Text
            variant="eyebrow"
            tone="muted"
            numberOfLines={2}
            style={{ fontSize: 10, marginTop: 2 }}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      {value ? <Text variant="numeric" style={{ fontSize: 16 }}>{value}</Text> : null}
      {trailing}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${title}, ${meta}` : title}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  );
}
