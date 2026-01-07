import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Save, Send, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import SectionCard from "./SectionCard";
import MenuItemsCard from "./cards/MenuItemsCard";
import OpeningHoursCard from "./cards/OpeningHoursCard";
import ReservationsCard from "./cards/ReservationsCard";
import ContactSocialCard from "./cards/ContactSocialCard";
import MediaGalleryCard from "./cards/MediaGalleryCard";
import AdvancedFeaturesCard from "./cards/AdvancedFeaturesCard";
import SettingsCard from "./cards/SettingsCard";
import PublishCard from "./cards/PublishCard";
import { Configuration } from "@/lib/api";

/**
 * Main card-based editor for the V2 configurator
 * Replaces the 15+ step wizard with an infinite-scroll card interface
 *
 * Features:
 * - Modular card-based sections
 * - Live preview on the right
 * - Save/Publish/Discard buttons at bottom
 * - Expandable/collapsible sections
 * - Real-time form state management
 */

interface CardBasedEditorProps {
  /**
   * Initial configuration (existing site or auto-generated)
   */
  initialConfig?: Configuration;
  /**
   * Callback when configuration is saved
   */
  onSave?: (config: Configuration) => Promise<void>;
  /**
   * Callback when site is published
   */
  onPublish?: (config: Configuration) => Promise<void>;
  /**
   * Whether to show live preview on the right
   */
  showPreview?: boolean;
}

interface ExpandedSections {
  [key: string]: boolean;
}

export function CardBasedEditor({
  initialConfig,
  onSave,
  onPublish,
  showPreview = true,
}: CardBasedEditorProps) {
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<Configuration>(
    initialConfig || {
      businessName: "",
      businessType: "restaurant",
      location: "",
      slogan: "",
      uniqueDescription: "",
      template: "modern",
      primaryColor: "#2563EB",
      secondaryColor: "#F8FAFC",
      fontFamily: "Inter",
      selectedPages: ["home", "menu", "contact"],
      customPages: [],
      menuItems: [],
      gallery: [],
      openingHours: {},
      contactMethods: [],
      socialMedia: {},
      onlineOrdering: false,
      onlineStore: false,
      teamArea: false,
      hasDomain: false,
    },
  );

  // UI state
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    business: true,
    design: true,
    pages: true,
    menu: true,
    hours: false,
    reservations: false,
    contact: false,
    gallery: false,
    advanced: false,
    settings: false,
    publish: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update form data and track changes
  const updateFormData = useCallback((updates: Partial<Configuration>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  // Toggle section expanded state
  const toggleSection = useCallback((sectionId: string, expanded: boolean) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: expanded,
    }));
  }, []);

  // Save draft
  const handleSave = async () => {
    if (!onSave) {
      toast({
        title: "Save function not configured",
        description: "Please provide an onSave callback",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      setHasChanges(false);
      toast({
        title: "Saved successfully",
        description: "Your configuration has been saved as a draft",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Publish site
  const handlePublish = async () => {
    if (!onPublish) {
      toast({
        title: "Publish function not configured",
        description: "Please provide an onPublish callback",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.businessName || !formData.businessType) {
      toast({
        title: "Missing required fields",
        description: "Please fill in Business Name and Business Type",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      await onPublish(formData);
      setHasChanges(false);
      toast({
        title: "Published successfully",
        description: "Your site is now live!",
      });
    } catch (error) {
      toast({
        title: "Publish failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    if (!hasChanges) return;
    if (confirm("Discard all changes? This cannot be undone.")) {
      setFormData(initialConfig || {});
      setHasChanges(false);
      toast({
        title: "Changes discarded",
        description: "Your configuration has been reset",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Split Layout: Cards (left) + Preview (right) */}
      <div
        className={`grid ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-6 p-6`}
      >
        {/* Left Panel: Cards */}
        <div className="space-y-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Configure Your Site
            </h1>
            <p className="text-gray-600 mt-2">
              Edit your site configuration below. Changes are auto-saved to your
              draft.
            </p>
          </div>

          {/* Sections - placeholder for actual card components */}
          <div className="space-y-4">
            {/* Business Info Card */}
            <SectionCard
              id="business"
              title="Business Information"
              description="Name, type, and basic details"
              defaultExpanded={expandedSections.business}
              onExpandChange={(exp) => toggleSection("business", exp)}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.businessName || ""}
                    onChange={(e) =>
                      updateFormData({ businessName: e.target.value })
                    }
                    placeholder="e.g., Café Vienna"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Business Type *
                  </label>
                  <select
                    value={formData.businessType || ""}
                    onChange={(e) =>
                      updateFormData({ businessType: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Café</option>
                    <option value="bar">Bar</option>
                    <option value="bakery">Bakery</option>
                    <option value="shop">Shop</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) =>
                      updateFormData({ location: e.target.value })
                    }
                    placeholder="e.g., Berlin, Germany"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Slogan
                  </label>
                  <input
                    type="text"
                    value={formData.slogan || ""}
                    onChange={(e) => updateFormData({ slogan: e.target.value })}
                    placeholder="e.g., The Best Coffee in the City"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formData.uniqueDescription || ""}
                    onChange={(e) =>
                      updateFormData({ uniqueDescription: e.target.value })
                    }
                    placeholder="Tell your customers what makes you special..."
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Design Card */}
            <SectionCard
              id="design"
              title="Design & Styling"
              description="Colors, fonts, and template"
              defaultExpanded={expandedSections.design}
              onExpandChange={(exp) => toggleSection("design", exp)}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Primary Color
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primaryColor || "#2563EB"}
                        onChange={(e) =>
                          updateFormData({ primaryColor: e.target.value })
                        }
                        className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={formData.primaryColor || "#2563EB"}
                        onChange={(e) =>
                          updateFormData({ primaryColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Secondary Color
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.secondaryColor || "#F8FAFC"}
                        onChange={(e) =>
                          updateFormData({ secondaryColor: e.target.value })
                        }
                        className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={formData.secondaryColor || "#F8FAFC"}
                        onChange={(e) =>
                          updateFormData({ secondaryColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Template
                  </label>
                  <select
                    value={formData.template || "modern"}
                    onChange={(e) =>
                      updateFormData({ template: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="minimalist">Minimalist</option>
                    <option value="modern">Modern</option>
                    <option value="stylish">Stylish</option>
                    <option value="cozy">Cozy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Font Family
                  </label>
                  <select
                    value={formData.fontFamily || "Inter"}
                    onChange={(e) =>
                      updateFormData({ fontFamily: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Merriweather">Merriweather</option>
                    <option value="Roboto">Roboto</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            {/* Pages Card */}
            <SectionCard
              id="pages"
              title="Pages & Features"
              description="Select which pages to include"
              defaultExpanded={expandedSections.pages}
              onExpandChange={(exp) => toggleSection("pages", exp)}
            >
              <div className="space-y-3">
                {["home", "menu", "gallery", "contact", "reservations"].map(
                  (page) => (
                    <label
                      key={page}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(formData.selectedPages || []).includes(page)}
                        onChange={(e) => {
                          const pages = formData.selectedPages || [];
                          if (e.target.checked) {
                            updateFormData({ selectedPages: [...pages, page] });
                          } else {
                            updateFormData({
                              selectedPages: pages.filter((p) => p !== page),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {page}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </SectionCard>

            {/* Menu Items Card */}
            <SectionCard
              id="menu"
              title="Menu Items"
              description="Add and manage your menu items"
              defaultExpanded={expandedSections.menu}
              onExpandChange={(exp) => toggleSection("menu", exp)}
            >
              <MenuItemsCard
                items={formData.menuItems || []}
                onChange={(items) => updateFormData({ menuItems: items })}
              />
            </SectionCard>

            {/* Opening Hours Card */}
            <SectionCard
              id="hours"
              title="Opening Hours"
              description="Set your business hours for each day"
              defaultExpanded={expandedSections.hours}
              onExpandChange={(exp) => toggleSection("hours", exp)}
            >
              <OpeningHoursCard
                hours={formData.openingHours}
                onChange={(hours) => updateFormData({ openingHours: hours })}
              />
            </SectionCard>

            {/* Reservations Card */}
            <SectionCard
              id="reservations"
              title="Reservations"
              description="Configure table reservations and bookings"
              defaultExpanded={expandedSections.reservations}
              onExpandChange={(exp) => toggleSection("reservations", exp)}
            >
              <ReservationsCard
                settings={{}}
                onChange={(settings) =>
                  updateFormData({ reservationsSettings: settings })
                }
              />
            </SectionCard>

            {/* Contact & Social Card */}
            <SectionCard
              id="contact"
              title="Contact & Social Media"
              description="Add phone, email, and social media links"
              defaultExpanded={expandedSections.contact}
              onExpandChange={(exp) => toggleSection("contact", exp)}
            >
              <ContactSocialCard
                contacts={formData.contactMethods || []}
                onChange={(contacts) =>
                  updateFormData({ contactMethods: contacts })
                }
              />
            </SectionCard>

            {/* Media Gallery Card */}
            <SectionCard
              id="gallery"
              title="Media Gallery"
              description="Upload images and photos"
              defaultExpanded={expandedSections.gallery}
              onExpandChange={(exp) => toggleSection("gallery", exp)}
            >
              <MediaGalleryCard
                images={formData.gallery || []}
                onChange={(images) => updateFormData({ gallery: images })}
              />
            </SectionCard>

            {/* Advanced Features Card */}
            <SectionCard
              id="advanced"
              title="Advanced Features"
              description="Enable premium features for your site"
              defaultExpanded={expandedSections.advanced}
              onExpandChange={(exp) => toggleSection("advanced", exp)}
            >
              <AdvancedFeaturesCard
                features={{
                  onlineOrdering: formData.onlineOrdering,
                  onlineStore: formData.onlineStore,
                  teamArea: formData.teamArea,
                }}
                onChange={(features) =>
                  updateFormData({
                    onlineOrdering: features.onlineOrdering || false,
                    onlineStore: features.onlineStore || false,
                    teamArea: features.teamArea || false,
                  })
                }
              />
            </SectionCard>

            {/* Settings Card */}
            <SectionCard
              id="settings"
              title="Settings & SEO"
              description="Configure SEO, analytics, and advanced options"
              defaultExpanded={expandedSections.settings}
              onExpandChange={(exp) => toggleSection("settings", exp)}
            >
              <SettingsCard
                settings={{}}
                onChange={(settings) =>
                  updateFormData({ seoSettings: settings })
                }
              />
            </SectionCard>

            {/* Publish Card */}
            <SectionCard
              id="publish"
              title="Publish"
              description="Publish your site to the web"
              defaultExpanded={expandedSections.publish}
              onExpandChange={(exp) => toggleSection("publish", exp)}
            >
              <PublishCard
                settings={{ isPublished: false }}
                businessName={formData.businessName}
                onPublish={onPublish}
              />
            </SectionCard>
          </div>
        </div>

        {/* Right Panel: Preview */}
        {showPreview && (
          <div className="hidden lg:block">
            <div className="sticky top-6 bg-white rounded-lg shadow-lg p-6 h-[600px] overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </h2>
              <div className="text-center text-gray-500 py-12">
                <p>Preview component coming soon</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {hasChanges && (
              <span className="text-sm text-amber-600 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-600 rounded-full" />
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleDiscard}
              disabled={!hasChanges || isSaving || isPublishing}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Discard
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || isPublishing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>

            <Button
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* Padding for fixed bottom bar */}
      <div className="h-24" />
    </div>
  );
}

export default CardBasedEditor;
