import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { normalizeImageSrc } from "@/lib/configurator-data";
import { uploadImageFile } from "@/lib/mediaUpload";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import type { GalleryImage } from "@/types/domain";

const UPLOAD_PARALLEL = 4;
/** Was der Hinweistext (gallery.sizeLimit) verspricht — und jetzt auch gilt. */
const MAX_BILDER = 20;
const MAX_BYTES_PRO_BILD = 5 * 1024 * 1024;

interface MediaGalleryStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

export function MediaGalleryStep({
  nextStep,
  prevStep,
}: MediaGalleryStepProps) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const gallery = useConfiguratorStore((s) => s.content.gallery);
  const actions = useConfiguratorActions();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Die Limits aus dem Hinweistext durchsetzen (Runde 8, M3): zu große
    // Dateien überspringen, über 20 Bilder hinaus nichts mehr annehmen —
    // und beides sagen, statt still zu verwerfen.
    const alle = Array.from(files);
    const zuGross = alle.filter((f) => f.size > MAX_BYTES_PRO_BILD);
    if (zuGross.length) {
      toast.error(
        `${zuGross.length === 1 ? "Ein Bild ist" : `${zuGross.length} Bilder sind`} größer als 5 MB und wurde${zuGross.length === 1 ? "" : "n"} übersprungen: ${zuGross.map((f) => f.name).join(", ")}`,
      );
    }
    let newFiles = alle.filter((f) => f.size <= MAX_BYTES_PRO_BILD);
    const platz = Math.max(0, MAX_BILDER - gallery.length);
    if (newFiles.length > platz) {
      toast.error(
        platz === 0
          ? `Die Galerie ist voll — maximal ${MAX_BILDER} Bilder.`
          : `Maximal ${MAX_BILDER} Bilder — nur die ersten ${platz} wurden übernommen.`,
      );
      newFiles = newFiles.slice(0, platz);
    }
    if (newFiles.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    // Sofortige lokale Vorschau; die blob:-URL überlebt aber weder Reload
    // noch Veröffentlichung — deshalb direkt im Hintergrund hochladen und
    // die URL durch die dauerhafte Storage-URL ersetzen.
    //
    // Alle Bilder in EINEM Zustandswechsel: checkThrottleGuard im Store wirft
    // ab 50 Änderungen je Sekunde. Eine Auswahl von 51+ Fotos brach vorher
    // beim 51. Bild mit "Infinite loop detected" ab.
    const neue = newFiles.map(
      (file) =>
        ({
          id: `${Date.now()}-${Math.random()}`,
          url: URL.createObjectURL(file),
          alt: file.name,
          file,
        }) as GalleryImage,
    );
    actions.content.addGalleryImages(neue);

    void ladeGestaffeltHoch(neue);
  };

  /**
   * Höchstens UPLOAD_PARALLEL Uploads gleichzeitig. Zwei Gründe: 60 Dateien
   * auf einmal an den Speicher zu schicken ist unfreundlich — und jede
   * Fertigmeldung ist ein updateGalleryImage, das ebenfalls unter dem
   * 50-je-Sekunde-Wächter steht. Gestaffelt kommen die Meldungen verteilt an.
   */
  const ladeGestaffeltHoch = async (bilder: GalleryImage[]) => {
    const warteschlange = [...bilder];
    const arbeiter = Array.from(
      { length: Math.min(UPLOAD_PARALLEL, warteschlange.length) },
      async () => {
        for (
          let bild = warteschlange.shift();
          bild;
          bild = warteschlange.shift()
        ) {
          const { id, file } = bild;
          if (!file) continue;
          try {
            const url = await uploadImageFile(file, await getToken());
            actions.content.updateGalleryImage(id, { url, file: undefined });
          } catch (e) {
            console.error("[Gallery] Upload fehlgeschlagen:", e);
            toast.error(
              `„${file.name}" konnte nicht hochgeladen werden — das Bild erscheint nicht auf der veröffentlichten Website.`,
            );
          }
        }
      },
    );
    await Promise.all(arbeiter);
  };

  const removeImage = (id: string) => {
    actions.content.removeGalleryImage(id);
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {t("steps.mediaGallery.title")}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t("steps.mediaGallery.subtitle")}
        </p>
      </div>

      <Card className="p-8 mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
          <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {t("gallery.uploadPhotos")}
          </h3>
          <p className="text-gray-600 mb-4">{t("gallery.dragAndDrop")}</p>
          <Button
            variant="outline"
            size="lg"
            onClick={() => document.getElementById("gallery-upload")?.click()}
            className="border-2 border-teal-300 hover:border-teal-400 hover:bg-teal-50 text-teal-700"
          >
            <Upload className="w-5 h-5 mr-2" />
            {t("gallery.chooseImages")}
          </Button>
          <input
            id="gallery-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <p className="text-xs text-gray-500 mt-4">{t("gallery.sizeLimit")}</p>
        </div>
      </Card>

      {gallery.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            {t("gallery.yourGallery")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={normalizeImageSrc(image)}
                    alt={image.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(image.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
