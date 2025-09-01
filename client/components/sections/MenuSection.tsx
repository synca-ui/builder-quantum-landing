import React from "react";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface MenuItem {
  name: string;
  description?: string;
  price: string;
  emoji?: string;
  id?: string;
}

interface MenuSectionProps {
  items: MenuItem[];
  onAddToCart?: (item: MenuItem) => void;
  onRemoveItem?: (index: number) => void;
  showOrderingButtons?: boolean;
  showRemoveButtons?: boolean;
  className?: string;
  templateStyle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

export function MenuSection({
  items,
  onAddToCart,
  onRemoveItem,
  showOrderingButtons = false,
  showRemoveButtons = false,
  className = "",
  templateStyle = "minimalist",
  primaryColor,
  secondaryColor,
  textColor,
}: MenuSectionProps) {
  const getTemplateStyles = () => {
    switch (templateStyle) {
      case "minimalist":
        return {
          container: "space-y-0",
          itemCard: "py-2 border-b border-gray-200 last:border-b-0",
          itemName: "font-medium text-sm text-black",
          itemDesc: "text-xs text-gray-600",
          itemPrice: "font-medium text-sm text-black",
          emoji: "hidden",
        };
      case "modern":
        return {
          container: "space-y-3",
          itemCard:
            "bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/40 shadow-xl",
          itemName: "font-bold text-sm text-white drop-shadow-md",
          itemDesc: "text-xs text-white drop-shadow-sm",
          itemPrice: "font-bold text-sm text-white drop-shadow-md",
          emoji: "hidden",
        };
      case "stylish":
        return {
          container: "space-y-3",
          itemCard:
            "bg-white/5 backdrop-blur rounded p-3 border border-white/10",
          itemName: "font-serif font-semibold text-sm text-emerald-100",
          itemDesc: "text-xs text-emerald-200/80",
          itemPrice: "font-serif font-semibold text-sm text-emerald-400",
          emoji: "hidden",
        };
      case "cozy":
        return {
          container: "space-y-3",
          // use neutral utility classes; colors applied via inline styles from props
          itemCard: "backdrop-blur rounded border p-3",
          itemName: "font-serif font-bold text-sm",
          itemDesc: "text-xs",
          itemPrice: "font-serif font-bold text-sm",
          emoji: "hidden",
        };
      default:
        return {
          container: "space-y-3",
          itemCard: "bg-white/90 backdrop-blur rounded-lg p-3 shadow-sm",
          itemName: "font-semibold text-sm",
          itemDesc: "text-xs text-gray-600",
          itemPrice: "font-bold text-sm",
          emoji: "hidden",
        };
    }
  };

  const styles = getTemplateStyles();

  if (items.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500 text-sm">
          No menu items added yet. Add items to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className={styles.itemCard}
          style={
            templateStyle === "cozy"
              ? {
                  backgroundColor: secondaryColor
                    ? `${secondaryColor}20`
                    : undefined,
                  borderColor: primaryColor,
                }
              : undefined
          }
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              {item.emoji && <span className={styles.emoji}>{item.emoji}</span>}
              <div className="flex-1">
                <h3
                  className={styles.itemName}
                  style={{ color: textColor || undefined }}
                >
                  {item.name}
                </h3>
                {item.description && (
                  <p
                    className={styles.itemDesc}
                    style={{ color: textColor ? `${textColor}CC` : undefined }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={styles.itemPrice}
                style={{ color: primaryColor || undefined }}
              >
                ${item.price}
              </span>

              {showOrderingButtons && onAddToCart && (
                <button
                  className="w-6 h-6 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center text-xs transition-transform hover:scale-110"
                  onClick={() => onAddToCart(item)}
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}

              {showRemoveButtons && onRemoveItem && (
                <button
                  onClick={() => onRemoveItem(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MenuSection;
