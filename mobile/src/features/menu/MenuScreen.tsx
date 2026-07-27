import { useState } from "react";
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
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

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
  const t = useT();
  const { menu, addMenuItem, removeMenuItem } = useStore();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const add = () => {
    if (!name.trim()) return;
    addMenuItem({ name: name.trim(), price: price.trim() || "—", category });
    toast.show(t({ de: "Gericht hinzugefügt", en: "Dish added" }));
    setName("");
    setPrice("");
  };

  const grouped = CATEGORIES.map((c) => ({ category: c, items: menu.filter((m) => m.category === c) })).filter(
    (g) => g.items.length > 0,
  );

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
      <NavHeader title={t({ de: "Speisekarte", en: "Menu" })} />

      {menu.length === 0 ? (
        <Card emphasis="subtle" padding={theme.spacing.xl} style={{ alignItems: "center", gap: theme.spacing.sm }}>
          <Text variant="cardTitle" style={{ textAlign: "center" }}>
            {t({ de: "Noch keine Gerichte", en: "No dishes yet" })}
          </Text>
          <Text variant="bodySm" tone="secondary" style={{ textAlign: "center", fontSize: 14.5 }}>
            {t({
              de: "53 % der Gäste schauen vorab. Leg dein erstes Gericht an - das bringt +12 Punkte im Präsenzscore.",
              en: "53% of guests check first. Add your first dish - it earns +12 points on your presence score.",
            })}
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
                  <Pressable
                    onPress={() => removeMenuItem(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t({ de: `${item.name} entfernen`, en: `Remove ${item.name}` })}
                    hitSlop={10}
                  >
                    <Text variant="numeric" tone="faint" style={{ fontSize: 20 }}>
                      ×
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ))
      )}

      {/* Neues Gericht */}
      <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
        <Eyebrow>{t({ de: "Neues Gericht", en: "New dish" })}</Eyebrow>
        <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t({ de: "Name (z. B. Flat White)", en: "Name (e.g. Flat White)" })}
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel={t({ de: "Name des Gerichts", en: "Dish name" })}
            style={[theme.text.body, field, { flex: 1 }]}
          />
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="4,20 €"
            placeholderTextColor={theme.colors.textFaint}
            accessibilityLabel={t({ de: "Preis", en: "Price" })}
            style={[theme.text.body, field, { width: 96 }]}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 9, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
        <PillButton
          label={t({ de: "Gericht hinzufügen", en: "Add dish" })}
          variant="ink"
          icon={<PlusIcon size={18} color={theme.colors.onInkAction} />}
          onPress={add}
        />
      </Card>

      <PillButton
        label={t({ de: "Fertig", en: "Done" })}
        variant="outline"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
