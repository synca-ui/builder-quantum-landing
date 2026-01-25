import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, Camera, Upload, Plus, X, Tag, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { normalizeImageSrc } from "@/lib/configurator-data";
import type { MenuItem } from "@/types/domain";

interface MenuProductsStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

export function MenuProductsStep({
  nextStep,
  prevStep,
}: MenuProductsStepProps) {
  const { t } = useTranslation();
  const menuItems = useConfiguratorStore((s) => s.content.menuItems);
  const categories = useConfiguratorStore((s) => s.content.categories) || [];
  const actions = useConfiguratorActions();

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    images: [] as { url: string; alt: string; file?: File }[],
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
    actions.content.setCategories(categories.filter(c => c !== cat));
    // Also remove category from items
    menuItems.forEach(item => {
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
    const newCats = categories.map(c => c === oldCat ? newCat.trim() : c);
    actions.content.setCategories(newCats);
    // Update items with old category
    menuItems.forEach(item => {
      if ((item as any).category === oldCat) {
        actions.content.updateMenuItem(item.id, { category: newCat.trim() } as any);
      }
    });
    if (activeCategory === oldCat) setActiveCategory(newCat.trim());
    setEditingCategory(null);
  };

  // Filter items by category
  const filteredItems = activeCategory
    ? menuItems.filter(item => (item as any).category === activeCategory)
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
      };
      actions.content.addMenuItem(itemToAdd);
      setNewItem({ name: "", description: "", price: "", category: "", images: [] });
    }
  };

  const removeMenuItem = (id: string) => {
    actions.content.removeMenuItem(id);
  };

  const handleUploadImagesForItem = (index: number, files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).map((file) => ({
      url: URL.createObjectURL(file),
      alt: file.name,
      file,
    }));

    const item = menuItems[index];
    if (item) {
      const prevImages = Array.isArray(item.images) ? item.images : [];
      const newImages = [...prevImages, ...images];
      actions.content.updateMenuItem(item.id, {
        images: newImages,
        image: newImages[0],
      });
    }
  };

  const handleUploadImagesForNew = (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).map((file) => ({
      url: URL.createObjectURL(file),
      alt: file.name,
      file,
    }));
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

        newItems.forEach((item) => actions.content.addMenuItem(item));

        try {
          e.target.value = "";
        } catch (err) {}
      } catch (err) {
        console.error("CSV parse error", err);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleMenuImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Menu image uploaded:", file.name);
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
              className="w-full border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
              onClick={() =>
                document.getElementById("menu-img-upload")?.click()
              }
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("menu.chooseImageFile")}
            </Button>
            <input
              id="menu-img-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMenuImageUpload}
            />
            <p className="text-xs text-gray-500 mt-2">JPG, PNG up to 10MB</p>
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
            <p className="text-xs text-gray-500 mt-2">
              {t("menu.csvFormat")}
            </p>
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

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t("menu.addNewItem")}</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t("menu.itemName")}
            </label>
            <Input
              type="text"
              placeholder={t("menu.itemNamePlaceholder")}
              value={newItem.name}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t("menu.itemDescription")}
            </label>
            <Input
              type="text"
              placeholder={t("menu.itemDescriptionPlaceholder")}
              value={newItem.description}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full"
            />
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
      </Card>

      {menuItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">{t("menu.yourMenuItems")}</h3>
          {menuItems.map((item, index) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{item.name}</h4>
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
                    ${item.price}
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
                      document.getElementById(`item-images-${index}`)?.click()
                    }
                  >
                    {t("menu.uploadImages")}
                  </Button>
                <input
                  id={`item-images-${index}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    handleUploadImagesForItem(index, e.target.files)
                  }
                />
                <div className="text-xs text-gray-500">
                  {Array.isArray(item.images) ? item.images.length : 0} {t("menu.images")}
                </div>
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
