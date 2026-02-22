/**
 * Creative Studio Dashboard Page
 * No-code editor for templates and menu management
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Palette,
  Sparkles,
  Layout,
  RefreshCw,
  Upload,
  Eye,
  Settings,
  Wand2,
  Star,
  Crown,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { cn } from "../../lib/utils";

interface Template {
  id: string;
  name: string;
  description: string;
  category: "Modern" | "Stylish" | "Cozy";
  isPremium: boolean;
  preview: string;
  avgRating: number;
  downloads: number;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

export default function CreativeStudioPage() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get("businessId") || undefined;

  const [activeTab, setActiveTab] = useState<"templates" | "menu" | "ai">(
    "templates",
  );
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Mock templates data
      const mockTemplates: Template[] = [
        {
          id: "modern-2024",
          name: "Modern Minimal",
          description: "Clean, modern design with focus on typography",
          category: "Modern",
          isPremium: false,
          preview: "/templates/modern-preview.jpg",
          avgRating: 4.8,
          downloads: 1240,
        },
        {
          id: "stylish-premium",
          name: "Stylish Premium",
          description: "Elegant design for upscale dining",
          category: "Stylish",
          isPremium: true,
          preview: "/templates/stylish-preview.jpg",
          avgRating: 4.9,
          downloads: 890,
        },
        {
          id: "cozy-warmth",
          name: "Cozy Warmth",
          description: "Warm, inviting design for family restaurants",
          category: "Cozy",
          isPremium: false,
          preview: "/templates/cozy-preview.jpg",
          avgRating: 4.7,
          downloads: 650,
        },
      ];

      // Mock menu data
      const mockMenuCategories: MenuCategory[] = [
        {
          id: "appetizers",
          name: "Vorspeisen",
          items: [
            {
              id: "bruschetta",
              name: "Bruschetta Classica",
              description: "Geröstetes Brot mit Tomaten und Basilikum",
              price: 8.9,
              imageUrl: "/menu/bruschetta.jpg",
            },
            {
              id: "carpaccio",
              name: "Rinder Carpaccio",
              description:
                "Dünn geschnittenes Rindfleisch mit Rucola und Parmesan",
              price: 12.9,
            },
          ],
        },
        {
          id: "mains",
          name: "Hauptgerichte",
          items: [
            {
              id: "pasta-carbonara",
              name: "Pasta Carbonara",
              description: "Spaghetti mit Ei, Pancetta und Parmesan",
              price: 14.9,
            },
            {
              id: "pizza-margherita",
              name: "Pizza Margherita",
              description: "Tomaten, Mozzarella und Basilikum",
              price: 12.9,
            },
          ],
        },
      ];

      setTemplates(mockTemplates);
      setCurrentTemplate(mockTemplates[0]);
      setMenuCategories(mockMenuCategories);
    } catch (error) {
      console.error("Error fetching creative studio data:", error);
    } finally {
      setLoading(false);
    }
  };

  const switchTemplate = async (templateId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setCurrentTemplate(template);
        // Here you would call the API to switch templates
      }
    } catch (error) {
      console.error("Error switching template:", error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout businessId={businessId}>
        <div className="card-elevated bg-white rounded-2xl p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout businessId={businessId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Creative Studio
            </h1>
            <p className="text-gray-600 mt-2">
              No-Code Editor für Templates und Menü-Design
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Eye className="w-4 h-4" />
              <span>Vorschau</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-lg hover:from-teal-600 hover:to-purple-700 transition-all">
              <Sparkles className="w-4 h-4" />
              <span>Veröffentlichen</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="card-elevated bg-white rounded-2xl overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { key: "templates", label: "Templates", icon: Layout },
                { key: "menu", label: "Menü Editor", icon: Settings },
                { key: "ai", label: "KI Assistent", icon: Wand2 },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={cn(
                    "flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors relative",
                    activeTab === tab.key
                      ? "text-teal-600 bg-teal-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>

                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-purple-600"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Templates Tab */}
            {activeTab === "templates" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Template-Bibliothek
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Wählen Sie ein Template und passen Sie es an Ihre Marke an
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option>Alle Kategorien</option>
                      <option>Modern</option>
                      <option>Stylish</option>
                      <option>Cozy</option>
                    </select>
                  </div>
                </div>

                {/* Current Template */}
                {currentTemplate && (
                  <div className="card-elevated bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-100 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-r from-teal-500 to-purple-600 flex items-center justify-center">
                          <Layout className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900">
                              {currentTemplate.name}
                            </h4>
                            {currentTemplate.isPremium && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                            <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                              Aktiv
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {currentTemplate.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm text-gray-600">
                                {currentTemplate.avgRating}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {currentTemplate.downloads} Downloads
                            </span>
                          </div>
                        </div>
                      </div>

                      <button className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Settings className="w-4 h-4" />
                        <span>Anpassen</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Template Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        "card-elevated bg-white rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1",
                        currentTemplate?.id === template.id &&
                          "ring-2 ring-teal-500",
                      )}
                      onClick={() => switchTemplate(template.id)}
                    >
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Layout className="w-12 h-12 text-gray-400" />
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900">
                              {template.name}
                            </h4>
                            {template.isPremium && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>

                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              template.category === "Modern" &&
                                "bg-blue-100 text-blue-700",
                              template.category === "Stylish" &&
                                "bg-purple-100 text-purple-700",
                              template.category === "Cozy" &&
                                "bg-orange-100 text-orange-700",
                            )}
                          >
                            {template.category}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {template.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm text-gray-600">
                              {template.avgRating}
                            </span>
                          </div>

                          <span className="text-sm text-gray-500">
                            {template.downloads} Downloads
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Editor Tab */}
            {activeTab === "menu" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Menü Editor
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Verwalten Sie Ihre Menükategorien und Gerichte
                    </p>
                  </div>

                  <button className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Gericht hinzufügen</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {menuCategories.map((category) => (
                    <div
                      key={category.id}
                      className="card-elevated bg-white rounded-xl p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">
                          {category.name}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {category.items.length} Gerichte
                        </span>
                      </div>

                      <div className="space-y-3">
                        {category.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 text-sm">
                                  {item.name}
                                </h5>
                                {item.description && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <span className="font-semibold text-teal-600 text-sm ml-2">
                                €{item.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Assistant Tab */}
            {activeTab === "ai" && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Wand2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    KI-gestützte Optimierung
                  </h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Lassen Sie sich von unserer KI bei der Optimierung Ihrer
                    Website helfen
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card-elevated bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <Palette className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Farbschema-Optimierung
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Optimiere Farben basierend auf deiner Küchenart für
                          bessere Conversion
                        </p>
                        <button className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
                          Analyse starten →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Menü-Optimierung
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Verbessere Beschreibungen und Preisstrategien für
                          höhere Umsätze
                        </p>
                        <button className="text-sm text-green-600 font-medium hover:text-green-700 transition-colors">
                          Analyse starten →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                        <Layout className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Layout-Verbesserung
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Optimiere das Layout für bessere
                          Benutzerfreundlichkeit
                        </p>
                        <button className="text-sm text-purple-600 font-medium hover:text-purple-700 transition-colors">
                          Analyse starten →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          SEO-Verbesserung
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Optimiere Inhalte für bessere Suchmaschinen-Rankings
                        </p>
                        <button className="text-sm text-orange-600 font-medium hover:text-orange-700 transition-colors">
                          Analyse starten →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
