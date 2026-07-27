import { useState } from "react";
import { TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Tag } from "../../components/ui/Chip";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { NavHeader } from "../../components/ui/NavHeader";
import { PillButton } from "../../components/ui/PillButton";
import { Screen } from "../../components/ui/Screen";
import { Toggle } from "../../components/ui/Toggle";
import { Text } from "../../components/ui/Text";
import { useT } from "../../lib/i18n";
import { useStore } from "../../lib/store";
import { useToast } from "../../lib/toast";
import { useTheme } from "../../theme";

/**
 * Profil verwalten - der „ein Ort"-Kern des Produkts.
 *
 * Von hier pflegt der Betrieb Name, Beschreibung, Öffnungszeiten (Google) und die
 * Instagram-Bio. Alles landet im Store und wirkt sofort dort, wo es angezeigt wird
 * (öffentliches Gastprofil, Journey-Zeiten). `focus` (google|instagram) hebt den
 * relevanten Block hervor.
 */
export function ProfileManagementScreen({ focus }: { focus?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { venueProfile, updateVenueProfile, updateHour } = useStore();

  const [name, setName] = useState(venueProfile.name);
  const [tagline, setTagline] = useState(venueProfile.tagline);
  const [bio, setBio] = useState(venueProfile.bio);
  const [instagramBio, setInstagramBio] = useState(venueProfile.instagramBio);

  const save = () => {
    updateVenueProfile({ name, tagline, bio, instagramBio });
    toast.show(t({ de: "Profil gespeichert", en: "Profile saved" }));
    router.back();
  };

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
      <NavHeader title={t({ de: "Profil verwalten", en: "Manage profile" })} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar initials="G" size={38} color="#4285F4" />
        <Avatar initials="Ig" size={38} color="#C13584" />
        <Text variant="bodySm" tone="secondary" style={{ flex: 1, fontSize: 14 }}>
          {t({ de: "Änderungen gehen an alle verbundenen Kanäle.", en: "Changes go to all connected channels." })}
        </Text>
      </View>

      {/* Betriebsinfo (Google Business) */}
      <Card
        padding={theme.spacing.lg}
        style={{
          gap: theme.spacing.md,
          ...(focus === "google" ? { borderWidth: 2, borderColor: theme.colors.primary } : {}),
        }}
      >
        <Eyebrow tone={focus === "google" ? "accent" : "muted"}>Google Business</Eyebrow>

        <View style={{ gap: 6 }}>
          <Eyebrow>Name</Eyebrow>
          <TextInput value={name} onChangeText={setName} style={[theme.text.body, field]} accessibilityLabel={t({ de: "Betriebsname", en: "Business name" })} />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>{t({ de: "Kurzbeschreibung", en: "Tagline" })}</Eyebrow>
          <TextInput value={tagline} onChangeText={setTagline} style={[theme.text.body, field]} accessibilityLabel={t({ de: "Kurzbeschreibung", en: "Tagline" })} />
        </View>

        <View style={{ gap: 6 }}>
          <Eyebrow>{t({ de: "Beschreibung", en: "Description" })}</Eyebrow>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            style={[theme.text.body, field, { minHeight: 92, textAlignVertical: "top" }]}
            accessibilityLabel={t({ de: "Beschreibung", en: "Description" })}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {venueProfile.tags.map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </View>
      </Card>

      {/* Öffnungszeiten */}
      <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
        <Eyebrow>{t({ de: "Öffnungszeiten", en: "Opening hours" })}</Eyebrow>
        {venueProfile.hours.map((h) => (
          <HourRow key={h.id} id={h.id} label={h.label} value={h.value} closed={h.closed} onChange={updateHour} />
        ))}
      </Card>

      {/* Instagram-Bio */}
      <Card
        padding={theme.spacing.lg}
        style={{
          gap: theme.spacing.md,
          ...(focus === "instagram" ? { borderWidth: 2, borderColor: theme.colors.primary } : {}),
        }}
      >
        <Eyebrow tone={focus === "instagram" ? "accent" : "muted"}>{t({ de: "Instagram-Bio", en: "Instagram bio" })}</Eyebrow>
        <TextInput
          value={instagramBio}
          onChangeText={setInstagramBio}
          multiline
          maxLength={150}
          style={[theme.text.body, field, { minHeight: 72, textAlignVertical: "top" }]}
          accessibilityLabel="Instagram-Bio"
        />
        <Eyebrow tone="faint" style={{ textTransform: "none" }}>
          {t({ de: `${instagramBio.length} / 150 Zeichen`, en: `${instagramBio.length} / 150 characters` })}
        </Eyebrow>
      </Card>

      <View style={{ marginTop: theme.spacing.sm }}>
        <PillButton label={t({ de: "Profil speichern", en: "Save profile" })} onPress={save} />
      </View>
    </Screen>
  );
}

/** Öffnungszeit-Zeile: Wert editierbar, „Geschlossen" schaltet den Tag ab. */
function HourRow({
  id,
  label,
  value,
  closed,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  closed?: boolean;
  onChange: (id: string, value: string, closed?: boolean) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [text, setText] = useState(closed ? "" : value);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
      <Text variant="numeric" style={{ fontSize: 15, width: 96 }}>
        {label}
      </Text>
      {closed ? (
        <View style={{ flex: 1 }}>
          <Text variant="numeric" tone="faint" style={{ fontSize: 15 }}>
            Geschlossen
          </Text>
        </View>
      ) : (
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            onChange(id, t, false);
          }}
          placeholder="8:00 – 18:00"
          placeholderTextColor={theme.colors.textFaint}
          accessibilityLabel={t({ de: `Öffnungszeit ${label}`, en: `Opening hours ${label}` })}
          style={[
            theme.text.body,
            {
              flex: 1,
              fontSize: 15,
              color: theme.colors.textPrimary,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              paddingVertical: 6,
            },
          ]}
        />
      )}
      <Toggle
        value={!closed}
        onValueChange={(open) => onChange(id, open ? value || "9:00 – 17:00" : "Geschlossen", !open)}
        accessibilityLabel={t({ de: `${label} geöffnet`, en: `${label} open` })}
      />
    </View>
  );
}
