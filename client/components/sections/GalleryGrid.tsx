import React from "react";
import { Camera, X } from "lucide-react";

export interface GalleryImage {
  url: string;
  alt: string;
  file?: File;
}

interface GalleryGridProps {
  images: GalleryImage[];
  onRemoveImage?: (index: number) => void;
  showRemoveButtons?: boolean;
  templateStyle?: string;
  className?: string;
  cols?: number;
}

export function GalleryGrid({
  images,
  onRemoveImage,
  showRemoveButtons = false,
  templateStyle = "minimalist",
  className = "",
  cols = 2,
}: GalleryGridProps) {
  const getTemplateStyles = () => {
    switch (templateStyle) {
      case "minimalist":
        return {
          container: `grid grid-cols-${cols} gap-2`,
          imageItem: "aspect-square bg-gray-100 rounded flex items-center justify-center overflow-hidden",
          placeholderIcon: "w-6 h-6 text-gray-400",
          placeholderText: "text-xs text-gray-500 mt-1",
          removeButton: "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500 hover:bg-red-600",
        };
      case "modern":
        return {
          container: `grid grid-cols-${cols} gap-3`,
          imageItem: "aspect-square bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/40 overflow-hidden group",
          placeholderIcon: "w-8 h-8 text-white/60",
          placeholderText: "text-xs text-white/60 mt-2",
          removeButton: "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500/80 backdrop-blur hover:bg-red-600/80",
        };
      case "stylish":
        return {
          container: `grid grid-cols-${cols} gap-3`,
          imageItem: "aspect-square bg-white/5 backdrop-blur rounded-lg flex items-center justify-center border border-white/10 overflow-hidden group",
          placeholderIcon: "w-8 h-8 text-emerald-400/60",
          placeholderText: "text-xs text-emerald-100/60 mt-2",
          removeButton: "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500/80 backdrop-blur hover:bg-red-600/80",
        };
      case "cozy":
        return {
          container: `grid grid-cols-${cols} gap-3`,
          imageItem: "aspect-square bg-slate-800/50 backdrop-blur rounded flex items-center justify-center border border-amber-500/30 overflow-hidden group",
          placeholderIcon: "w-8 h-8 text-amber-400/60",
          placeholderText: "text-xs text-amber-200/60 mt-2",
          removeButton: "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500/80 backdrop-blur hover:bg-red-600/80",
        };
      default:
        return {
          container: `grid grid-cols-${cols} gap-2`,
          imageItem: "aspect-square bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden group",
          placeholderIcon: "w-6 h-6 text-gray-400",
          placeholderText: "text-xs text-gray-500 mt-1",
          removeButton: "opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-500 hover:bg-red-600",
        };
    }
  };

  const styles = getTemplateStyles();

  const renderPlaceholderItems = () => {
    const placeholderCount = Math.max(0, 4 - images.length);
    return Array.from({ length: placeholderCount }, (_, i) => (
      <div key={`placeholder-${i}`} className={styles.imageItem}>
        <div className="text-center">
          <Camera className={styles.placeholderIcon} />
          <p className={styles.placeholderText}>Photo {images.length + i + 1}</p>
        </div>
      </div>
    ));
  };

  if (images.length === 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        {renderPlaceholderItems()}
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {images.map((image, index) => (
        <div key={index} className={`${styles.imageItem} relative group`}>
          <img
            src={image.url}
            alt={image.alt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {showRemoveButtons && onRemoveImage && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
              <button
                onClick={() => onRemoveImage(index)}
                className={`${styles.removeButton} p-2 rounded-full text-white`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}
      {images.length < 4 && renderPlaceholderItems()}
    </div>
  );
}

export default GalleryGrid;
