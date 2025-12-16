import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Trash2 } from "lucide-react";

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  caption?: string;
}

interface MediaGalleryCardProps {
  images?: GalleryImage[];
  onChange?: (images: GalleryImage[]) => void;
}

export function MediaGalleryCard({
  images = [],
  onChange,
}: MediaGalleryCardProps) {
  const [gallery, setGallery] = useState<GalleryImage[]>(images || []);
  const [newImage, setNewImage] = useState<Partial<GalleryImage>>({
    url: "",
    alt: "",
    caption: "",
  });
  const [uploadError, setUploadError] = useState<string>("");

  const handleImageChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setNewImage({ ...newImage, url });
      setUploadError("");
    };
    reader.readAsDataURL(file);
  };

  const addImage = () => {
    if (!newImage.url || !newImage.alt?.trim()) {
      setUploadError("Please provide image URL and alt text");
      return;
    }

    const image: GalleryImage = {
      id: `img-${Date.now()}`,
      url: newImage.url,
      alt: newImage.alt || "Gallery image",
      caption: newImage.caption,
    };

    const updated = [...gallery, image];
    setGallery(updated);
    onChange?.(updated);
    setNewImage({ url: "", alt: "", caption: "" });
    setUploadError("");
  };

  const removeImage = (id: string) => {
    const updated = gallery.filter((img) => img.id !== id);
    setGallery(updated);
    onChange?.(updated);
  };

  const updateImage = (id: string, updates: Partial<GalleryImage>) => {
    const updated = gallery.map((img) =>
      img.id === id ? { ...img, ...updates } : img,
    );
    setGallery(updated);
    onChange?.(updated);
  };

  return (
    <div className="space-y-4">
      {/* Image Gallery Grid */}
      {gallery.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Gallery Images ({gallery.length})
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {gallery.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => removeImage(image.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {image.caption && (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {image.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Image Form */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">
          Add Gallery Image
        </h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image
          </label>
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <Upload className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">
              {newImage.url ? "Change image" : "Upload or paste image URL"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files?.[0] && handleImageChange(e.target.files[0])
              }
              className="hidden"
            />
          </label>
          {newImage.url && (
            <img
              src={newImage.url}
              alt="Preview"
              className="mt-2 w-full h-32 object-cover rounded-lg"
            />
          )}
        </div>

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Alt Text *
          </label>
          <input
            type="text"
            value={newImage.alt || ""}
            onChange={(e) => setNewImage({ ...newImage, alt: e.target.value })}
            placeholder="Describe the image for accessibility"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Caption (optional)
          </label>
          <input
            type="text"
            value={newImage.caption || ""}
            onChange={(e) =>
              setNewImage({ ...newImage, caption: e.target.value })
            }
            placeholder="Display caption for the image"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <Button
          onClick={addImage}
          disabled={!newImage.url || !newImage.alt?.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          Add Image
        </Button>
      </div>

      {gallery.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No images added yet
        </p>
      )}
    </div>
  );
}

export default MediaGalleryCard;
