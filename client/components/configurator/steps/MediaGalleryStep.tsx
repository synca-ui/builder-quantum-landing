import { useState } from "react";
import { ArrowLeft, ChevronRight, Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { normalizeImageSrc } from "@/lib/configurator-data";
import type { GalleryImage } from "@/types/domain";

interface MediaGalleryStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

export function MediaGalleryStep({
  nextStep,
  prevStep,
}: MediaGalleryStepProps) {
  const gallery = useConfiguratorStore((s) => s.content.gallery);
  const actions = useConfiguratorActions();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((file) => {
        const newImage: GalleryImage = {
          id: `${Date.now()}-${Math.random()}`,
          url: URL.createObjectURL(file),
          alt: file.name,
          file: file,
        };
        actions.content.addGalleryImage(newImage);
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
          Upload your photos
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Show off your space, food, and atmosphere. High-quality images help
          attract customers and showcase your business personality.
        </p>
      </div>

      <Card className="p-8 mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
          <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Upload Photos
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop your images or click to browse
          </p>
          <Button
            variant="outline"
            size="lg"
            onClick={() => document.getElementById("gallery-upload")?.click()}
            className="border-2 border-teal-300 hover:border-teal-400 hover:bg-teal-50 text-teal-700"
          >
            <Upload className="w-5 h-5 mr-2" />
            Choose Images
          </Button>
          <input
            id="gallery-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <p className="text-xs text-gray-500 mt-4">
            JPG, PNG up to 5MB each • Maximum 20 images
          </p>
        </div>
      </Card>

      {gallery.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Your Gallery</h3>
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
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
