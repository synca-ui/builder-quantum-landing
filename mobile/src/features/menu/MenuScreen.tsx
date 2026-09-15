import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { PlusIcon } from "../../components/icons";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useStore } from "../../lib/store";
import { SERVER_MENU_PREFIX, kategorienDerKarte } from "../../lib/venueAdopt";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/** Vorschläge für neue Gerichte, solange die Karte selbst noch keine Kategorien kennt. */
const CATEGORIES = ["Kaffee", "Gebäck", "Frühstück", "Getränke"];


/**
 * Speisekarte hinterlegen (aus Profil-Check & öffentlichem Profil).
 *
 * War zuvor ein toter Verweis - jetzt ein echter Editor: Gerichte mit Name, Preis und
 * Kategorie anlegen und entfernen. Das erste Gericht schließt die Profil-Aufgabe ab
 * (+12 Punkte im Präsenzscore).
 */
export function MenuScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { menu, addMenuItem, removeMenuItem, hasRealVenue, showcase } = useStore();
  const echterBetrieb = hasRealVenue && !showcase;
  const hatServerKarte = menu.some((m) => m.id.startsWith(SERVER_MENU_PREFIX));
  // Kartenreihenfolge nur, wo es eine echte Karte gibt. Im Demo und Showcase
  // bleiben Gruppen und Chips in der festen Reihenfolge der Vorschläge (Kaffee,
  // Gebäck, Frühstück, Getränke) - sonst sprängen die Chips nach dem ersten
  // angelegten Gericht um. Fremde Kategorien hängen hinten an.
  const karteFolgen = echterBetrieb || hatServerKarte;
  const kartenKategorien = useMemo(() => {
    const vorhanden = kategorienDerKarte(menu);
    return karteFolgen
      ? vorhanden
      : [...CATEGORIES.filter((c) => vorhanden.includes(c)), ...vorhanden.filter((c) => !CATEGORIES.includes(c))];
  }, [menu, karteFolgen]);
  // Auswahl für neue Gerichte: bei echter Karte erst deren Kategorien, dann die
  // übrigen Vorschläge; im Demo immer die Vorschläge in fester Reihenfolge.
  const auswahl = useMemo(
    () =>
      karteFolgen
        ? [...kartenKategorien, ...CATEGORIES.filter((c) => !kartenKategorien.includes(c))]
        : [...CATEGORIES, ...kartenKategorien.filter((c) => !CATEGORIES.includes(c))],
    [kartenKategorien, karteFolgen],
  );

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(auswahl[0] ?? CATEGORIES[0]);

  const add = () => {
    if (!name.trim()) return;
    addMenuItem({ name: name.trim(), price: price.trim() || "—", category });
    toast.show("Gericht hinzugefügt");
    setName("");
    setPrice("");
  };

  const grouped = kartenKategorien.map((c) => ({
    category: c,
    items: menu.filter((m) => (m.category?.trim() || "Speisekarte") === c),
  }));

  const field = {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.control,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: theme.colors.textPrimary,
  } as const;

  return (
    <Screen animated="subtle" contentStyle={{ gap: theme.spacing.lg }}>
      <NavHeader title="Speisekarte" />

      {echterBetrieb && hatServerKarte ? (
        // Ehrlich sagen, woher die Karte kommt und wo sie gepflegt wird: Neue
        // Gerichte aus der App landen nur auf diesem Gerät (store.tsx), nicht in
        // der Web-App.
        <Eyebrow tone="faint">
          Aus deiner Web-App übernommen · gepflegt im Konfigurator
        </Eyebrow>
      ) : null}

      {menu.length === 0 ? (
        <Card emphasis="subtle" padding={theme.spacing.xl} style={{ alignItems: "center", gap: theme.spacing.sm }}>
          <Text variant="cardTitle" style={{ textAlign: "center" }}>
            Noch keine Gerichte
          </Text>
          <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14.5 }}>
            53 % der Gäste schauen vorab. Leg dein erstes Gericht an - das bringt +12 Punkte im
            Präsenzscore.
          </Text>
        </Card>
      ) : (
        grouped.map((group) => (
          <View key={group.category} style={{ gap: theme.spacing.sm }}>
            <Eyebrow>{group.category}</Eyebrow>
            <Card padding={0} style={{ paddingHorizontal: theme.spacing.lg }}>
              {group.items.map((item, i) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.md,
                    paddingVertical: 13,
                    borderBottomWidth: i < group.items.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.surfaceSunken,
                  }}
                >
                  <Text variant="cardTitleSm" style={{ flex: 1, fontSize: 16 }}>
                    {item.name}
                  </Text>
                  <Text variant="numeric" tone="secondary" style={{ fontSize: 15 }}>
                    {item.price}
                  </Text>
                  {item.id.startsWith(SERVER_MENU_PREFIX) ? null : (
                    // Gerichte der Web-App lassen sich hier nicht entfernen: Der
                    // nächste Abgleich brächte sie zurück, und in der Web-App
                    // stünden sie ohnehin weiter.
                    <Pressable
                      onPress={() => removeMenuItem(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name} entfernen`}
                      hitSlop={10}
                    >
                      <Text variant="numeric" tone="faint" style={{ fontSize: 20 }}>
                        ×
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))
      )}

      {/* Neues Gericht */}
      <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
        <Eyebrow>{echterBetrieb ? "Neues Gericht · nur auf diesem Gerät" : "Neues Gericht"}</Eyebrow>
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name (z. B. Flat White)"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel="Name des Gerichts"
            style={[theme.text.body, field, { flex: 1 }]}
          />
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="4,20 €"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel="Preis"
            style={[theme.text.body, field, { width: 96 }]}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
          {auswahl.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
        <PillButton
          label="Gericht hinzufügen"
          variant="ink"
          icon={<PlusIcon size={18} color={theme.colors.onInkAction} />}
          onPress={add}
        />
      </Card>

      <PillButton label="Fertig" variant="outline" onPress={() => router.back()} />
    </Screen>
  );
}
