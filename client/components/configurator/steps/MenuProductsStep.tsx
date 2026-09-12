import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ArrowLeft,
  ChevronRight,
  Camera,
  Upload,
  Plus,
  X,
  Tag,
  Edit2,
  Check,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ergaenzeDehogaLegende,
  fehlendeKuerzel,
  kuerzelAnzeige,
  labelText,
  parseKuerzel,
  sortiereKuerzel,
  STANDARD_LABELS,
} from "@/lib/kennzeichnung";
import { Badge } from "@/components/ui/badge";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { normalizeImageSrc } from "@/lib/configurator-data";
import { uploadImageFile } from "@/lib/mediaUpload";
import { extractMenuFromFile } from "@/lib/menuExtract";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import type { MenuItem } from "@/types/domain";

interface MenuProductsStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

/**
 * Kennzeichnung eines Gerichts: Ernährungs-Labels als Schalter, Allergen-
 * und Zusatzstoff-Kürzel als Text. Bis hierher kamen beide Felder NUR aus
 * der automatischen Erkennung — wer seine Karte von Hand pflegte, konnte
 * kein Allergen eintragen, obwohl LMIV/LMIDV es für jedes Gericht verlangen.
 *
 * Die Kürzel werden erst beim Verlassen des Felds (oder mit Enter)
 * übernommen: Jeder Tastendruck als Store-Aktion liefe in den
 * Endlosschleifen-Wächter des Stores.
 */
function KennzeichnungFelder({
  labels,
  allergens,
  onLabels,
  onAllergens,
  idPrefix,
}: {
  labels: string[];
  allergens: string[];
  onLabels: (labels: string[]) => void;
  onAllergens: (codes: string[]) => void;
  idPrefix: string;
}) {
  const vorgabe = allergens.map(kuerzelAnzeige).join(", ");
  const [text, setText] = useState(vorgabe);
  useEffect(() => setText(vorgabe), [vorgabe]);
  const commit = () => onAllergens(parseKuerzel(text));
  const eigene = labels.filter(
    (l) => !(STANDARD_LABELS as readonly string[]).includes(labelText(l)),
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <span className="block text-sm font-bold text-gray-700 mb-2">
          Ernährungs-Labels
        </span>
        <div className="flex flex-wrap gap-2">
          {STANDARD_LABELS.map((l) => {
            const aktiv = labels.map(labelText).includes(l);
            return (
              <button
                type="button"
                key={l}
                aria-pressed={aktiv}
                onClick={() =>
                  onLabels(
                    aktiv
                      ? labels.filter((x) => labelText(x) !== l)
                      : [...labels, l],
                  )
                }
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  aktiv
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                }`}
              >
                {l}
              </button>
            );
          })}
          {eigene.map((l) => (
            <span
              key={l}
              className="px-3 py-1.5 rounded-full text-sm border bg-gray-50 text-gray-700 border-gray-300 flex items-center gap-1"
            >
              {l}
              <button
                type="button"
                aria-label={`Label ${l} entfernen`}
                onClick={() => onLabels(labels.filter((x) => x !== l))}
                className="hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          „glutenfrei“ ist eine geregelte Angabe (höchstens 20 mg/kg Gluten,
          VO (EU) 828/2014) — nur setzen, wenn die Küche das sicherstellt.
        </p>
      </div>
      <div>
        <label
          htmlFor={`${idPrefix}-allergene`}
          className="block text-sm font-bold text-gray-700 mb-2"
        >
          Allergene und Zusatzstoffe (Kürzel)
        </label>
        <Input
          id={`${idPrefix}-allergene`}
          type="text"
          value={text}
          placeholder="z. B. A, C, G, 2"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          className="w-full bg-white"
        />
        <p className="text-xs text-gray-500 mt-1.5">
          Kürzel wie auf deiner Karte, mit Komma getrennt. Was sie bedeuten,
          steht in der Legende — sie erscheint unter der Speisekarte.
        </p>
      </div>
    </div>
  );
}

/**
 * Legende der Kürzel: welches Kürzel steht für welchen Stoff. Sie erscheint
 * unter der Speisekarte der Web-App — LMIDV § 2 erlaubt Kürzel nur, wenn
 * ihre Bedeutung in derselben Karte gut lesbar erklärt ist. Die Zuordnung
 * legt der Betrieb fest; die DEHOGA-Vorlage (Buchstaben für Allergene,
 * Ziffern für Zusatzstoffe) ist ein Angebot und überschreibt nichts.
 */
function LegendeKarte() {
  const legend = useConfiguratorStore((s) => s.content.allergenLegend) || {};
  const menuItems = useConfiguratorStore((s) => s.content.menuItems);
  const actions = useConfiguratorActions();
  const [neuKuerzel, setNeuKuerzel] = useState("");
  const [neuText, setNeuText] = useState("");

  const codes = sortiereKuerzel(Object.keys(legend));
  const fehlend = fehlendeKuerzel(legend, menuItems);

  const setzen = (code: string, text: string) => {
    const k = parseKuerzel(code)[0];
    if (!k) return;
    // setAllergenLegend führt zusammen — Streichen geht nur über die
    // eigene Aktion, sonst käme der Eintrag beim nächsten Merge zurück.
    if (text.trim()) actions.content.setAllergenLegend({ [k]: text.trim() });
    else actions.content.removeAllergenLegendEntry(k);
  };
  const hinzufuegen = () => {
    const k = parseKuerzel(neuKuerzel)[0];
    if (!k || !neuText.trim()) return;
    setzen(k, neuText);
    setNeuKuerzel("");
    setNeuText("");
  };

  return (
    <Card className="p-6 mb-6 border-amber-100 bg-amber-50/40">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-amber-700" />
        <h3 className="text-lg font-bold text-gray-900">
          Allergene und Zusatzstoffe erklären (Legende)
        </h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Die 14 Hauptallergene müssen bei jedem Gericht erkennbar sein
        (LMIV, LMIDV § 2). Kürzel sind erlaubt, wenn ihre Bedeutung in
        derselben Karte gut lesbar steht — diese Legende erscheint unter
        deiner Speisekarte. Allergene und Zusatzstoffe sollen unterscheidbar
        bleiben, üblich sind Buchstaben für Allergene und Ziffern für
        Zusatzstoffe.
      </p>

      {fehlend.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            An deinen Gerichten stehen Kürzel ohne Erklärung:{" "}
            <strong>{fehlend.map(kuerzelAnzeige).join(", ")}</strong>. Gäste
            sehen sie dann unerklärt — bitte unten ergänzen.
          </span>
        </div>
      )}

      {codes.length > 0 ? (
        <div className="space-y-2 mb-4">
          {codes.map((code) => (
            <div key={code} className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-mono font-semibold text-gray-800">
                {kuerzelAnzeige(code)}
              </span>
              <Input
                type="text"
                aria-label={`Bedeutung von ${kuerzelAnzeige(code)}`}
                defaultValue={legend[code]}
                onBlur={(e) => setzen(code, e.target.value)}
                className="flex-1 bg-white"
              />
              <button
                type="button"
                aria-label={`Kürzel ${kuerzelAnzeige(code)} entfernen`}
                onClick={() => setzen(code, "")}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic mb-4">
          Noch keine Legende. Übernimm die DEHOGA-Vorlage oder trage deine
          eigenen Kürzel ein.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="text"
          aria-label="Neues Kürzel"
          placeholder="Kürzel"
          value={neuKuerzel}
          onChange={(e) => setNeuKuerzel(e.target.value)}
          className="w-24 bg-white"
        />
        <Input
          type="text"
          aria-label="Bedeutung des neuen Kürzels"
          placeholder="Bedeutung, z. B. Glutenhaltiges Getreide"
          value={neuText}
          onChange={(e) => setNeuText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && hinzufuegen()}
          className="flex-1 min-w-[12rem] bg-white"
        />
        <Button
          type="button"
          onClick={hinzufuegen}
          disabled={!parseKuerzel(neuKuerzel).length || !neuText.trim()}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            actions.content.setAllergenLegend(ergaenzeDehogaLegende(legend))
          }
        >
          DEHOGA-Vorlage ergänzen
        </Button>
      </div>
    </Card>
  );
}

// Debounced Input Helper für Menu Items
const DebouncedMenuInput = ({
  type = "text",
  placeholder,
  value,
  onChange,
  className = "",
}: {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 400);
  const lastPushedRef = useRef(value);

  useEffect(() => {
    setLocalValue(value);
    lastPushedRef.current = value;
  }, [value]);

  /**
   * Nur melden, was der Nutzer hier wirklich getippt hat.
   *
   * Vorher lautete die Bedingung `debouncedValue !== value`. Nach dem
   * Hinzufügen eines Gerichts setzt der Parent name/description auf "",
   * debouncedValue hing aber noch 400 ms auf dem alten Text — die Bedingung
   * war sofort wahr und schrieb den alten Text zurück. Ergebnis: Name und
   * Beschreibung blieben nach dem Anlegen stehen.
   */
  useEffect(() => {
    if (debouncedValue === lastPushedRef.current) return;
    lastPushedRef.current = debouncedValue;
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  return (
    <Input
      type={type}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      className={className}
    />
  );
};

export function MenuProductsStep({
  nextStep,
  prevStep,
}: MenuProductsStepProps) {
  const { t } = useTranslation();
  const menuItems = useConfiguratorStore((s) => s.content.menuItems);
  const categories = useConfiguratorStore((s) => s.content.categories) || [];
  const actions = useConfiguratorActions();
  const { getToken } = useAuth();
  /** Läuft gerade eine Speisekarten-Erkennung? Sperrt den Knopf dagegen. */
  const [menuScanLaeuft, setMenuScanLaeuft] = useState(false);

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    images: [] as { url: string; alt: string; file?: File }[],
    labels: [] as string[],
    allergens: [] as string[],
  });

  // Category management state
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      actions.content.setCategories([...categories, newCategory.trim()]);
      setNewCategory("");
    }
  };

  const removeCategory = (cat: string) => {
    actions.content.setCategories(categories.filter((c) => c !== cat));
    // Also remove category from items
    menuItems.forEach((item) => {
      if ((item as any).category === cat) {
        actions.content.updateMenuItem(item.id, { category: undefined } as any);
      }
    });
    if (activeCategory === cat) setActiveCategory(null);
  };

  const updateCategory = (oldCat: string, newCat: string) => {
    if (!newCat.trim() || categories.includes(newCat.trim())) {
      setEditingCategory(null);
      return;
    }
    const newCats = categories.map((c) => (c === oldCat ? newCat.trim() : c));
    actions.content.setCategories(newCats);
    // Update items with old category
    menuItems.forEach((item) => {
      if ((item as any).category === oldCat) {
        actions.content.updateMenuItem(item.id, {
          category: newCat.trim(),
        } as any);
      }
    });
    if (activeCategory === oldCat) setActiveCategory(newCat.trim());
    setEditingCategory(null);
  };

  // Filter items by category
  const filteredItems = activeCategory
    ? menuItems.filter((item) => (item as any).category === activeCategory)
    : menuItems;

  const addMenuItem = () => {
    if (newItem.name && newItem.price) {
      const itemToAdd: MenuItem = {
        id: Date.now().toString(),
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        category: newItem.category || undefined,
        image: newItem.images?.[0],
        images: newItem.images,
        ...(newItem.labels.length ? { labels: newItem.labels } : {}),
        ...(newItem.allergens.length ? { allergens: newItem.allergens } : {}),
      };
      actions.content.addMenuItem(itemToAdd);
      setNewItem({
        name: "",
        description: "",
        price: "",
        category: "",
        images: [],
        labels: [],
        allergens: [],
      });
    }
  };

  const removeMenuItem = (id: string) => {
    actions.content.removeMenuItem(id);
  };

  // Lokale blob:-Vorschau sofort, dauerhafte Storage-URL nach dem Upload —
  // nur die überlebt Reload und Veröffentlichung.
  const uploadAndReplace = (
    file: File,
    localUrl: string,
    replace: (permanentUrl: string) => void,
  ) => {
    void (async () => {
      try {
        const url = await uploadImageFile(file, await getToken());
        replace(url);
      } catch (e) {
        console.error("[MenuItem] Upload fehlgeschlagen:", e);
        toast.error(
          `„${file.name}" konnte nicht hochgeladen werden — das Bild erscheint nicht auf der veröffentlichten Website.`,
        );
      }
    })();
    return localUrl;
  };

  /**
   * Bilder an ein Gericht haengen.
   *
   * Nimmt das GERICHT, nicht seine Position. Vorher stand hier
   * `menuItems[index]` — der Index kam aber aus filteredItems.map(). Sobald ein
   * Kategoriefilter aktiv war, zeigte er auf ein anderes Gericht: Wer unter
   * "Desserts" ein Bild zum Apfelkuechl hochlud, haengte es in Wahrheit an die
   * Tagessuppe. Ein Index in eine gefilterte Liste ist als Schluessel
   * grundsaetzlich unbrauchbar; die id ist eindeutig.
   */
  const handleUploadImagesForItem = (item: MenuItem, files: FileList | null) => {
    if (!files || !item) return;

    const images = Array.from(files).map((file) => {
      const localUrl = URL.createObjectURL(file);
      uploadAndReplace(file, localUrl, (permanentUrl) => {
        const current = useConfiguratorStore
          .getState()
          .content.menuItems.find((i) => i.id === item.id);
        if (!current) return;
        const updated = (current.images || []).map((img) =>
          img.url === localUrl
            ? { ...img, url: permanentUrl, file: undefined }
            : img,
        );
        actions.content.updateMenuItem(item.id, {
          images: updated,
          image: updated[0],
        });
      });
      return { url: localUrl, alt: file.name, file };
    });

    const prevImages = Array.isArray(item.images) ? item.images : [];
    const newImages = [...prevImages, ...images];
    actions.content.updateMenuItem(item.id, {
      images: newImages,
      image: newImages[0],
    });
  };

  const handleUploadImagesForNew = (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).map((file) => {
      const localUrl = URL.createObjectURL(file);
      uploadAndReplace(file, localUrl, (permanentUrl) => {
        setNewItem((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img.url === localUrl
              ? { ...img, url: permanentUrl, file: undefined }
              : img,
          ),
        }));
      });
      return { url: localUrl, alt: file.name, file };
    });
    setNewItem((prev) => ({ ...prev, images: [...prev.images, ...images] }));
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = String(event.target?.result || "");
        if (!text) return;

        text = text.replace(/^\uFEFF/, "").replace(/\r\n?|\n/g, "\n");

        const firstLine = text.split("\n")[0] || "";
        const delimiter =
          (firstLine.match(/;/g)?.length || 0) >
          (firstLine.match(/,/g)?.length || 0)
            ? ";"
            : firstLine.includes("\t")
              ? "\t"
              : ",";

        const parseLine = (line: string) => {
          const out: string[] = [];
          let cur = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (ch === delimiter && !inQuotes) {
              out.push(cur);
              cur = "";
            } else {
              cur += ch;
            }
          }
          out.push(cur);
          return out.map((v) => v.trim());
        };

        const rows = text.split("\n").filter((l) => l.trim());
        if (rows.length === 0) return;

        const headerCells = parseLine(rows[0]).map((h) =>
          h
            .toLowerCase()
            .replace(/^"(.*)"$/, "$1")
            .trim(),
        );

        const nameKeys = [
          "name",
          "dish",
          "item",
          "title",
          "produkt",
          "gericht",
        ];
        const descKeys = ["description", "desc", "details", "beschreibung"];
        const priceKeys = ["price", "preis", "cost", "amount"];

        const headerMatched = headerCells.some(
          (h) =>
            nameKeys.includes(h) ||
            priceKeys.includes(h) ||
            descKeys.includes(h),
        );

        let dataRows = headerMatched ? rows.slice(1) : rows;

        let nameIdx = -1;
        let descIdx = -1;
        let priceIdx = -1;

        if (headerMatched) {
          const getIdx = (keys: string[]) =>
            headerCells.findIndex((h) => keys.includes(h));
          nameIdx = getIdx(nameKeys);
          descIdx = getIdx(descKeys);
          priceIdx = getIdx(priceKeys);

          if (nameIdx === -1 && headerCells.length >= 1) nameIdx = 0;
          if (priceIdx === -1 && headerCells.length >= 2)
            priceIdx = headerCells.length - 1;
        } else {
          const sampleCells = parseLine(rows[0]);
          const colCount = sampleCells.length;
          nameIdx = 0;
          descIdx = colCount >= 2 ? 1 : -1;
          priceIdx = colCount >= 2 ? colCount - 1 : 1;
        }

        const newItems = dataRows
          .map((line, index) => {
            const cells = parseLine(line).map((v) => v.replace(/""/g, '"'));
            const clean = (s?: string) =>
              (s || "")
                .replace(/[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu, "")
                .trim();
            const num = (s?: string) =>
              (s || "").replace(/[^0-9,\.\-]/g, "").replace(/,/g, ".");

            const name = clean(cells[nameIdx] || "");
            const description = clean(
              descIdx !== -1 ? cells[descIdx] || "" : "",
            );
            const priceRaw = num(cells[priceIdx] || "");

            const price = priceRaw
              ? isNaN(Number(priceRaw))
                ? priceRaw
                : Number(priceRaw).toFixed(2)
              : "";

            return name && price
              ? {
                  id: `csv-${Date.now()}-${index}`,
                  name,
                  description,
                  price,
                }
              : null;
          })
          .filter(Boolean) as MenuItem[];

        // Aus demselben Grund wie beim Foto-Upload: einzeln angehaengt bricht
        // eine CSV mit ueber 50 Zeilen an der Schutzbremse des Stores ab.
        actions.content.addMenuItems(newItems);

        try {
          e.target.value = "";
        } catch (err) {}
      } catch (err) {
        console.error("CSV parse error", err);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  /**
   * A1.4 — Foto oder PDF der Speisekarte hochladen, erkennen, übernehmen.
   *
   * Vorher stand hier ein console.log. Der Knopf öffnete den Dateidialog, und
   * dann passierte nichts: ein Knopf, der nichts tut. Der Server konnte das
   * schon die ganze Zeit (server/routes/menu.ts), nur rief ihn niemand.
   *
   * Doppelte Gerichte werden übersprungen statt angehängt: Wer die Karte
   * zweimal hochlädt — oder sie neben einem Scrape-Ergebnis hochlädt — soll
   * nicht jedes Schnitzel doppelt in der Liste finden.
   */
  const handleMenuImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // Das Feld sofort leeren, sonst löst dieselbe Datei kein change mehr aus.
    try {
      e.target.value = "";
    } catch {}
    if (!file) return;

    /**
     * Ohne Anmeldung gar nicht erst losschicken.
     *
     * Der manuelle Konfigurator ist absichtlich ohne Konto begehbar ("Ich will
     * noch nicht live gehen" in der Modus-Auswahl). `POST /api/menu/extract`
     * verlangt aber eine Anmeldung — der Endpunkt ruft eine kostenpflichtige
     * Erkennung auf. Wer ohne Konto eine Karte hochlud, bekam deshalb
     * ausgerechnet an der wichtigsten Stelle des Konfigurators
     * "Die Erkennung konnte nicht gestartet werden (HTTP 401)": eine
     * technische Meldung, die nicht sagt, was zu tun ist.
     *
     * getToken() liefert auch dann null, wenn die Sitzung abgelaufen ist —
     * beides ist derselbe Fall und dieselbe Antwort.
     *
     * Die Wettfrist ist kein Schmuck. Clerk lädt sein Skript von
     * clerk.maitr.de nach; kommt es nicht durch (Werbeblocker, gesperrte
     * Domain, lokal die Produktionsschlüssel), reiht der Ersatz-Client die
     * Anfrage nur ein: getToken() löst dann WEDER auf NOCH aus. Beobachtet am
     * 31.08.2026 auf localhost — der Knopf öffnete den Dateidialog und tat
     * danach nichts, ohne Meldung und ohne Ladeanzeige. Nach der Frist gilt
     * dasselbe wie bei fehlender Anmeldung: sagen, was zu tun ist.
     */
    const token = await Promise.race([
      getToken().catch(() => null),
      new Promise<null>((fertig) => setTimeout(() => fertig(null), 4000)),
    ]);
    if (!token) {
      toast.error(
        "Zum Einlesen der Speisekarte bitte anmelden — alles andere kannst du auch ohne Konto ausprobieren.",
        { duration: 8000 },
      );
      return;
    }

    setMenuScanLaeuft(true);
    const meldung = toast.loading("Speisekarte wird gelesen …");
    try {
      const ergebnis = await extractMenuFromFile(file, token);

      // Zuerst die Legende: Ohne sie stehen an den Gerichten nur Kuerzel wie
      // "a1", und die sind fuer einen Gast mit einer Unvertraeglichkeit
      // wertlos. Sie ist je Karte verschieden und kommt deshalb mit ihr.
      if (ergebnis.allergenLegend) {
        actions.content.setAllergenLegend(ergebnis.allergenLegend);
      }

      const vorhanden = new Set(
        useConfiguratorStore
          .getState()
          .content.menuItems.map((i) => (i.name || "").trim().toLowerCase()),
      );
      // Erst sammeln, dann EINMAL anhaengen: Der Store wirft ab 50 Aenderungen
      // je Sekunde ("Infinite loop detected"). Eine erkannte Karte hat leicht
      // 120 Gerichte — in einer Schleife einzeln angehaengt bricht der Upload
      // genau bei den grossen Karten ab.
      const neue: MenuItem[] = [];
      for (const gericht of ergebnis.items) {
        const schluessel = (gericht.name || "").trim().toLowerCase();
        if (!schluessel || vorhanden.has(schluessel)) continue;
        vorhanden.add(schluessel);
        neue.push({
          id: gericht.id || `scan-${schluessel.replace(/\W+/g, "-")}`,
          name: gericht.name,
          description: gericht.description || "",
          // Preis WEGLASSEN statt "" setzen. Das Zod-Schema des Servers prüft
          // price mit z.coerce.number().positive().optional() — undefined ist
          // erlaubt, "" wird zu 0 und fällt durch. Das ganze Speichern der
          // Konfiguration scheitert dann mit HTTP 400, während die Oberfläche
          // "Gespeichert" meldet.
          //
          // Vorher fiel das kaum auf, weil die Regel-Erkennung fast nur
          // Gerichte MIT Preis ausgab. Seit die Strukturierung über ein Modell
          // läuft, bleibt der Preis dort leer, wo die Karte keinen druckt —
          // beim Mittagstisch nach Wochentagen etwa ganze Blöcke.
          ...(gericht.price ? { price: gericht.price } : {}),
          ...(gericht.category ? { category: gericht.category } : {}),
          ...(gericht.allergens?.length ? { allergens: gericht.allergens } : {}),
          ...(gericht.labels?.length ? { labels: gericht.labels } : {}),
          ...(gericht.extras?.length ? { extras: gericht.extras } : {}),
        } as MenuItem);
      }
      actions.content.addMenuItems(neue);

      /**
       * Die Rubriken der erkannten Karte MÜSSEN mit angemeldet werden.
       *
       * Die Vorschau gruppiert nach content.categories und zeigt nur, was dort
       * eingetragen ist (TemplatePreviewContent: `categories.map(...)` und
       * darin `menuItems.filter(item => item.category === category)`). Ein
       * Gericht mit einer nicht angemeldeten Rubrik verschwindet daher
       * vollständig aus der Vorschau — und taucht erst auf der
       * veröffentlichten Seite wieder auf. Der Wirt sieht seine Karte also
       * unvollständig und veröffentlicht sie trotzdem, oder er scannt entnervt
       * noch einmal.
       *
       * Solange die Regeln erkannten, fiel das kaum auf: Sie vergaben selten
       * eine brauchbare Rubrik. Seit der Strukturierung durch ein Modell trägt
       * fast jedes Gericht die Rubrik, die auf der Karte steht.
       *
       * Reihenfolge wie auf der Karte, keine Dubletten, Bestehendes zuerst.
       */
      const neueRubriken: string[] = [];
      for (const g of neue) {
        const rubrik = (g.category || "").trim();
        if (!rubrik) continue;
        if (categories.includes(rubrik) || neueRubriken.includes(rubrik)) continue;
        neueRubriken.push(rubrik);
      }
      if (neueRubriken.length) {
        actions.content.setCategories([...categories, ...neueRubriken]);
      }

      const uebernommen = neue.length;

      if (uebernommen > 0) {
        toast.success(
          `${uebernommen} ${uebernommen === 1 ? "Gericht" : "Gerichte"} übernommen`,
          { id: meldung },
        );
      } else {
        // Ehrlich sagen, WARUM nichts kam — die Diagnose des Servers nennt den
        // Grund (kein OCR-Anbieter, Datei unlesbar, Karte ohne Preise).
        toast.error(
          ergebnis.items.length > 0
            ? "Diese Gerichte stehen schon in der Liste"
            : ergebnis.diagnostics[ergebnis.diagnostics.length - 1] ||
              "Auf dieser Datei war keine Speisekarte zu erkennen",
          { id: meldung, duration: 8000 },
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Die Erkennung ist fehlgeschlagen",
        { id: meldung, duration: 8000 },
      );
    } finally {
      setMenuScanLaeuft(false);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {t("steps.menuProducts.title")}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t("steps.menuProducts.subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-2xl flex items-center justify-center">
              <Camera className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t("menu.uploadMenuImage")}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {t("menu.uploadMenuImageDesc")}
            </p>
            <Button
              variant="outline"
              disabled={menuScanLaeuft}
              className="w-full border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700 disabled:opacity-60"
              onClick={() =>
                document.getElementById("menu-img-upload")?.click()
              }
            >
              {menuScanLaeuft ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Karte wird gelesen …
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {t("menu.chooseImageFile")}
                </>
              )}
            </Button>
            <input
              id="menu-img-upload"
              type="file"
              // Auch PDF: Auf Gasthof-Websites liegt die Karte weit öfter als
              // PDF vor denn als Foto, und der Server liest beides.
              accept="image/*,application/pdf"
              className="hidden"
              disabled={menuScanLaeuft}
              onChange={handleMenuImageUpload}
            />
            <p className="text-xs text-gray-500 mt-2">JPG, PNG oder PDF</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
              <Upload className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t("menu.uploadCSV")}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {t("menu.uploadCSVDesc")}
            </p>
            <Button
              variant="outline"
              className="w-full border-2 border-dashed border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700"
              onClick={() => document.getElementById("csv-upload")?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("menu.chooseCSVFile")}
            </Button>
            <input
              id="csv-upload"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCSVUpload}
            />
            <p className="text-xs text-gray-500 mt-2">{t("menu.csvFormat")}</p>
          </div>
        </Card>
      </div>

      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="h-px bg-gray-300 flex-1"></div>
          <span className="text-gray-500 font-medium">{t("menu.or")}</span>
          <div className="h-px bg-gray-300 flex-1"></div>
        </div>
      </div>

      {/* CATEGORY MANAGEMENT */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-purple-50 to-teal-50 border-purple-100">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">
            Kategorien verwalten
          </h3>
        </div>

        {/* Add new category */}
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Neue Kategorie (z.B. Heißgetränke)..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            className="flex-1 bg-white"
          />
          <Button
            onClick={addCategory}
            disabled={!newCategory.trim()}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Category chips */}
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={activeCategory === null ? "default" : "outline"}
              className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${
                activeCategory === null
                  ? "bg-gray-800 text-white"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => setActiveCategory(null)}
            >
              Alle ({menuItems.length})
            </Badge>
            {categories.map((cat) => {
              const itemCount = menuItems.filter(
                (item) => (item as any).category === cat,
              ).length;
              const isEditing = editingCategory === cat;

              return (
                <div key={cat} className="group relative">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={editCategoryValue}
                        onChange={(e) => setEditCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            updateCategory(cat, editCategoryValue);
                          if (e.key === "Escape") setEditingCategory(null);
                        }}
                        className="h-7 w-32 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => updateCategory(cat, editCategoryValue)}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Badge
                      variant={activeCategory === cat ? "default" : "outline"}
                      className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${
                        activeCategory === cat
                          ? "bg-purple-600 text-white"
                          : "hover:bg-purple-50 hover:border-purple-300"
                      }`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat} ({itemCount})
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(cat);
                          setEditCategoryValue(cat);
                        }}
                        className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCategory(cat);
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Noch keine Kategorien. Füge z.B. "Vorspeisen", "Hauptgerichte",
            "Getränke" hinzu.
          </p>
        )}
      </Card>

      <LegendeKarte />

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {t("menu.addNewItem")}
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t("menu.itemName")}
            </label>
            <DebouncedMenuInput
              type="text"
              placeholder={t("menu.itemNamePlaceholder")}
              value={newItem.name}
              onChange={(value) =>
                setNewItem((prev) => ({ ...prev, name: value }))
              }
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t("menu.itemDescription")}
            </label>
            <DebouncedMenuInput
              type="text"
              placeholder={t("menu.itemDescriptionPlaceholder")}
              value={newItem.description}
              onChange={(value) =>
                setNewItem((prev) => ({ ...prev, description: value }))
              }
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Kategorie
            </label>
            <select
              value={newItem.category}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Keine Kategorie</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t("menu.itemPrice")}
            </label>
            <div className="flex">
              <Input
                type="number"
                step="0.01"
                placeholder="9.99"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, price: e.target.value }))
                }
                className="flex-1"
              />
              <Button
                onClick={addMenuItem}
                disabled={!newItem.name || !newItem.price}
                className="ml-2 bg-teal-500 hover:bg-teal-600"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            {t("menu.images")}
          </label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() =>
                document.getElementById("new-item-images")?.click()
              }
            >
              {t("menu.uploadImages")}
            </Button>
            <input
              id="new-item-images"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUploadImagesForNew(e.target.files)}
            />
            <div className="text-xs text-gray-500">
              {newItem.images.length} {t("menu.selected")}
            </div>
          </div>
          {newItem.images.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {newItem.images.map((im, idx) => (
                <div
                  key={idx}
                  className="aspect-square bg-gray-100 rounded overflow-hidden"
                >
                  <img
                    src={normalizeImageSrc(im)}
                    alt={im.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <KennzeichnungFelder
            idPrefix="neu"
            labels={newItem.labels}
            allergens={newItem.allergens}
            onLabels={(labels) => setNewItem((prev) => ({ ...prev, labels }))}
            onAllergens={(allergens) =>
              setNewItem((prev) => ({ ...prev, allergens }))
            }
          />
        </div>
      </Card>

      {menuItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              {t("menu.yourMenuItems")}
              {activeCategory && (
                <span className="text-purple-600 ml-2">({activeCategory})</span>
              )}
            </h3>
            <span className="text-sm text-gray-500">
              {filteredItems.length} von {menuItems.length} Artikeln
            </span>
          </div>
          {filteredItems.map((item, index) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    {(item as any).category && (
                      <Badge
                        variant="outline"
                        className="text-xs px-2 py-0.5 bg-purple-50 border-purple-200 text-purple-700"
                      >
                        {(item as any).category}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {item.description}
                    </p>
                  )}
                  {Array.isArray(item.images) && item.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {item.images.slice(0, 4).map((im: any, i2: number) => (
                        <div
                          key={i2}
                          className="aspect-square bg-gray-100 rounded overflow-hidden"
                        >
                          <img
                            src={normalizeImageSrc(im)}
                            alt={im.alt}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-teal-600">
                    {item.price}€
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMenuItem(item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById(`item-images-${item.id}`)?.click()
                  }
                >
                  {t("menu.uploadImages")}
                </Button>
                <input
                  id={`item-images-${item.id}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    handleUploadImagesForItem(item as MenuItem, e.target.files)
                  }
                />
                <div className="text-xs text-gray-500">
                  {Array.isArray(item.images) ? item.images.length : 0}{" "}
                  {t("menu.images")}
                </div>
              </div>

              {/* Kennzeichnung — zusammengeklappt zeigt die Zeile, was gesetzt ist */}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-700 select-none">
                  <span className="font-semibold">Kennzeichnung</span>
                  <span className="text-gray-500">
                    {": "}
                    {[
                      ...(item.labels ?? []).map(labelText),
                      ...(item.allergens ?? []).map(kuerzelAnzeige),
                    ].join(" · ") || "keine Angaben"}
                  </span>
                </summary>
                <div className="mt-3">
                  <KennzeichnungFelder
                    idPrefix={item.id}
                    labels={item.labels ?? []}
                    allergens={item.allergens ?? []}
                    onLabels={(labels) =>
                      actions.content.updateMenuItem(item.id, {
                        labels: labels.length ? labels : undefined,
                      } as any)
                    }
                    onAllergens={(allergens) =>
                      actions.content.updateMenuItem(item.id, {
                        allergens: allergens.length ? allergens : undefined,
                      } as any)
                    }
                  />
                </div>
              </details>

              {/* ✅ HIGHLIGHT CHECKBOX */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={(item as any).isHighlight || false}
                    onChange={(e) => {
                      const currentHighlights = menuItems.filter(
                        (d) => (d as any).isHighlight,
                      ).length;

                      // Verhindere mehr als 3 Highlights
                      if (e.target.checked && currentHighlights >= 3) {
                        return;
                      }

                      actions.content.updateMenuItem(item.id, {
                        isHighlight: e.target.checked,
                      } as any);
                    }}
                    disabled={
                      !(item as any).isHighlight &&
                      menuItems.filter((d) => (d as any).isHighlight).length >=
                        3
                    }
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-purple-600 transition-colors">
                      Als Highlight anzeigen
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Wird prominent auf der Startseite angezeigt
                    </p>
                  </div>
                  {menuItems.filter((d) => (d as any).isHighlight).length >=
                    3 &&
                    !(item as any).isHighlight && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-amber-50 border-amber-300 text-amber-700"
                      >
                        Max. 3 erreicht
                      </Badge>
                    )}
                </label>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between mt-8">
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            prevStep();
          }}
          variant="outline"
          size="lg"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          {t("common.back")}
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          {t("common.next")}
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
