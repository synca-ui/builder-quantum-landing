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
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((file) => {
        const id = `${Date.now()}-${Math.random()}`;
        // Sofortige lokale Vorschau; die blob:-URL überlebt aber weder Reload
        // noch Veröffentlichung — deshalb direkt im Hintergrund hochladen und
        // die URL durch die dauerhafte Storage-URL ersetzen.
        actions.content.addGalleryImage({
          id,
          url: URL.createObjectURL(file),
          alt: file.name,
          file: file,
        } as GalleryImage);

        void (async () => {
          try {
            const url = await uploadImageFile(file, await getToken());
            actions.content.updateGalleryImage(id, { url, file: undefined });
          } catch (e) {
            console.error("[Gallery] Upload fehlgeschlagen:", e);
            toast.error(
              `„${file.name}" konnte nicht hochgeladen werden — das Bild erscheint nicht auf der veröffentlichten Website.`,
            );
          }
        })();
      });
    }
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
