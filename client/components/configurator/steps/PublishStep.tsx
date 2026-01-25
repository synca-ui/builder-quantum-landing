import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Cloud, Rocket, Check, Eye, Home, AlertCircle, ChevronRight, ExternalLink, Copy, Share2, Server, Globe2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { deploy, isNetlifyMCPAvailable, isVercelMCPAvailable } from "@/lib/deployment";
import type { Configuration } from "@/types/domain";

interface PublishStepProps {
  prevStep: () => void;
  getLiveUrl?: () => string;
  getDisplayedDomain?: () => string;
  saveToBackend?: (data: Partial<Configuration>) => Promise<void>;
}

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  required: boolean;
  category: "business" | "design" | "content" | "contact" | "domain";
}

export function PublishStep({
  prevStep,
  getLiveUrl,
  getDisplayedDomain,
  saveToBackend,
}: PublishStepProps) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [deploymentProvider, setDeploymentProvider] = useState<"netlify" | "vercel" | "internal">("internal");

  const fullState = useConfiguratorStore((s) => s);
  const actions = useConfiguratorActions();

  const business = fullState.business;
  const design = fullState.design;
  const pages = fullState.pages;
  const contact = fullState.contact;
  const content = fullState.content;
  const features = fullState.features;

  // Check deployment provider availability
  const netlifyAvailable = isNetlifyMCPAvailable();
  const vercelAvailable = isVercelMCPAvailable();

  // Get publishing status from store
  const publishing = fullState.publishing;
  const wasAlreadyPublished = publishing.status === "published" && !!publishing.publishedUrl;

  const liveUrl = getLiveUrl
    ? getLiveUrl()
    : publishing.publishedUrl || `https://${business.domain?.selectedDomain || business.name.toLowerCase().replace(/\s+/g, "")}.maitr.de`;

  const displayDomain = getDisplayedDomain
    ? getDisplayedDomain()
    : `${business.domain?.selectedDomain || business.name.toLowerCase().replace(/\s+/g, "")}.maitr.de`;

  // Comprehensive checklist
  const checklist: ChecklistItem[] = useMemo(() => [
    // Business
    {
      id: "business-name",
      label: "Geschäftsname",
      description: business.name || "Nicht angegeben",
      checked: !!business.name && business.name.length >= 2,
      required: true,
      category: "business",
    },
    {
      id: "business-type",
      label: "Geschäftstyp",
      description: business.type ? `${business.type.charAt(0).toUpperCase()}${business.type.slice(1)}` : "Nicht ausgewählt",
      checked: !!business.type,
      required: true,
      category: "business",
    },
    {
      id: "business-location",
      label: "Standort / Adresse",
      description: business.location || "Optional",
      checked: !!business.location,
      required: false,
      category: "business",
    },
    {
      id: "business-slogan",
      label: "Slogan / Beschreibung",
      description: business.slogan ? `"${business.slogan.substring(0, 30)}..."` : "Optional",
      checked: !!business.slogan || !!business.uniqueDescription,
      required: false,
      category: "business",
    },
    // Design
    {
      id: "design-template",
      label: "Template ausgewählt",
      description: design.template ? `${design.template.charAt(0).toUpperCase()}${design.template.slice(1)}` : "Nicht ausgewählt",
      checked: !!design.template,
      required: true,
      category: "design",
    },
    {
      id: "design-colors",
      label: "Farben angepasst",
      description: `Primär: ${design.primaryColor || "Standard"}`,
      checked: !!design.primaryColor && !!design.secondaryColor,
      required: false,
      category: "design",
    },
    // Content
    {
      id: "content-menu",
      label: "Speisekarte / Produkte",
      description: content.menuItems.length > 0 ? `${content.menuItems.length} Artikel` : "Keine Artikel",
      checked: content.menuItems.length > 0,
      required: false,
      category: "content",
    },
    {
      id: "content-hours",
      label: "Öffnungszeiten",
      description: Object.keys(content.openingHours || {}).length > 0 ? "Konfiguriert" : "Nicht konfiguriert",
      checked: Object.keys(content.openingHours || {}).length > 0,
      required: false,
      category: "content",
    },
    {
      id: "content-gallery",
      label: "Bildergalerie",
      description: content.gallery.length > 0 ? `${content.gallery.length} Bilder` : "Keine Bilder",
      checked: content.gallery.length > 0,
      required: false,
      category: "content",
    },
    // Contact
    {
      id: "contact-email",
      label: "E-Mail Adresse",
      description: contact.email || "Nicht angegeben",
      checked: !!contact.email,
      required: false,
      category: "contact",
    },
    {
      id: "contact-phone",
      label: "Telefonnummer",
      description: contact.phone || "Nicht angegeben",
      checked: !!contact.phone,
      required: false,
      category: "contact",
    },
    // Domain
    {
      id: "domain-selected",
      label: "Domain / Subdomain",
      description: displayDomain,
      checked: !!business.domain?.selectedDomain || !!business.domain?.domainName,
      required: true,
      category: "domain",
    },
  ], [business, design, content, contact, pages, displayDomain]);

  // Calculate progress
  const requiredItems = checklist.filter(item => item.required);
  const completedRequired = requiredItems.filter(item => item.checked);
  const allItems = checklist;
  const completedAll = allItems.filter(item => item.checked);
  
  const requiredProgress = Math.round((completedRequired.length / requiredItems.length) * 100);
  const overallProgress = Math.round((completedAll.length / allItems.length) * 100);
  
  const canPublish = completedRequired.length === requiredItems.length;

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const configData = actions.data.getFullConfiguration();

      // Save to backend first
      if (saveToBackend) {
        await saveToBackend(configData);
      }

      const token = await getToken();
      const subdomain =
        business.domain?.selectedDomain ||
        business.name.toLowerCase().replace(/\s+/g, "");

      // Deploy using the deployment helper (Netlify/Vercel MCP or internal)
      const result = await deploy({
        subdomain,
        config: configData,
        token: token || undefined,
      });

      if (result.success) {
        setPublishedUrl(result.publishedUrl || liveUrl);
        setDeploymentProvider(result.provider);
        setIsPublished(true);

        // Update store with publishing status
        actions.publishing.updatePublishingInfo({
          status: "published",
          publishedUrl: result.publishedUrl || liveUrl,
          previewUrl: result.previewUrl,
          publishedAt: new Date().toISOString(),
        });
      } else {
        throw new Error(result.error || "Deployment failed");
      }

    } catch (error) {
      console.error("Publishing failed:", error);
      alert("Veröffentlichung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "business": return "Geschäft";
      case "design": return "Design";
      case "content": return "Inhalt";
      case "contact": return "Kontakt";
      case "domain": return "Domain";
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "business": return "bg-blue-100 text-blue-700";
      case "design": return "bg-purple-100 text-purple-700";
      case "content": return "bg-orange-100 text-orange-700";
      case "contact": return "bg-green-100 text-green-700";
      case "domain": return "bg-teal-100 text-teal-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {t("steps.publish.title")}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t("steps.publish.subtitle")}
        </p>
      </div>

      {!isPublished ? (
        <div className="space-y-8">
          {/* Already Published Banner */}
          {wasAlreadyPublished && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-900">Website bereits veröffentlicht</p>
                  <a
                    href={publishing.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:underline flex items-center gap-1"
                  >
                    {publishing.publishedUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                  {publishing.publishedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Zuletzt veröffentlicht: {new Date(publishing.publishedAt).toLocaleString('de-DE')}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(publishing.publishedUrl, "_blank")}
                  className="shrink-0 border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Eye className="w-4 h-4 mr-1" /> Ansehen
                </Button>
              </div>
            </Card>
          )}

          {/* Progress Overview */}
          <Card className="p-6 bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Bereitschaft zur Veröffentlichung
              </h3>
              <div className="text-right">
                <span className={`text-2xl font-bold ${canPublish ? 'text-green-600' : 'text-orange-600'}`}>
                  {overallProgress}%
                </span>
                <p className="text-xs text-gray-500">
                  {completedAll.length} von {allItems.length} Punkten
                </p>
              </div>
            </div>
            <Progress value={overallProgress} className="h-3" />
            
            {!canPublish && (
              <div className="mt-4 flex items-start gap-2 text-orange-700 bg-orange-50 rounded-lg p-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Pflichtfelder fehlen</p>
                  <p className="opacity-80">
                    Bitte fülle alle mit * markierten Felder aus, bevor du veröffentlichst.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Deployment Provider Info */}
          <Card className="p-6 border-dashed">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              Hosting & Deployment
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Internal Hosting (Always available) */}
              <div className={`p-4 rounded-xl border-2 ${
                !netlifyAvailable && !vercelAvailable
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Globe2 className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Maitr Hosting</p>
                    <p className="text-xs text-gray-500">Inklusiv & schnell</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Deine Website wird auf unserer globalen Infrastruktur gehostet.
                </p>
                {!netlifyAvailable && !vercelAvailable && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-teal-600 font-medium">
                    <Check className="w-3 h-3" /> Aktiv
                  </div>
                )}
              </div>

              {/* Netlify Option */}
              <div className={`p-4 rounded-xl border-2 ${
                netlifyAvailable ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
                      <path d="M28.589 14.135l-.014-.006c-.008-.003-.016-.006-.023-.013a.11.11 0 01-.028-.093l.773-4.726 3.625 3.626-3.77 1.604a.083.083 0 01-.033.006h-.015a.104.104 0 01-.02-.003 1.09 1.09 0 01-.495-.395zm5.973-.224l-4.897-4.897.038-.231a.106.106 0 01.021-.057c.01-.013.027-.027.059-.027h.036l5.796 1.49-1.053 3.722zm-6.39-4.967l.002-.013.013-.063a.106.106 0 01.021-.046c.01-.012.027-.022.05-.022h.037l8.67 2.228-2.11.746-6.683-2.83zm8.67 2.228l-2.11.746-6.683-2.83.002-.014.013-.062a.106.106 0 01.021-.047c.01-.012.027-.022.05-.022h.037l8.67 2.229zm0 0z" fill="#05BDBA"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Netlify</p>
                    <p className="text-xs text-gray-500">Edge-Deployment</p>
                  </div>
                </div>
                {netlifyAvailable ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Verbunden und bereit für Deployment.
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-purple-600 font-medium">
                      <Check className="w-3 h-3" /> Verbunden
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">
                      Verbinde Netlify für erweiterte Features.
                    </p>
                    <a
                      href="#open-mcp-popover"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 font-medium hover:underline"
                    >
                      Netlify verbinden <ChevronRight className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Detailed Checklist */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Check className="w-5 h-5 text-teal-500" />
              Checkliste vor Veröffentlichung
            </h3>

            <div className="space-y-3">
              {checklist.map((item) => (
                <div 
                  key={item.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                    item.checked 
                      ? 'bg-green-50 border-green-200' 
                      : item.required 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    item.checked 
                      ? 'bg-green-500' 
                      : item.required 
                        ? 'bg-orange-300' 
                        : 'bg-gray-300'
                  }`}>
                    {item.checked && <Check className="w-4 h-4 text-white" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${item.checked ? 'text-green-900' : 'text-gray-900'}`}>
                        {item.label}
                        {item.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(item.category)}`}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                    {item.description && (
                      <p className={`text-sm truncate ${item.checked ? 'text-green-700' : 'text-gray-500'}`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Preview URL */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Deine Website-URL
            </h3>
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Deine Website wird verfügbar sein unter:</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 font-mono text-lg font-medium text-green-800 break-all">
                  https://{displayDomain}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(`https://${displayDomain}`)}
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </Card>

          {/* Publish Button */}
          <div className="text-center pt-4">
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !canPublish}
              size="lg"
              className={`px-12 py-6 text-xl font-bold rounded-full shadow-2xl transition-all duration-300 ${
                canPublish 
                  ? 'bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 hover:scale-105' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isPublishing ? (
                <>
                  <Cloud className="mr-3 w-6 h-6 animate-pulse" />
                  Wird veröffentlicht...
                </>
              ) : (
                <>
                  <Rocket className="mr-3 w-6 h-6" />
                  Website veröffentlichen
                </>
              )}
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              {canPublish 
                ? "Deine Website ist in wenigen Sekunden online!"
                : "Bitte fülle alle Pflichtfelder aus"
              }
            </p>
          </div>
        </div>
      ) : (
        /* SUCCESS STATE */
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
              <Check className="w-16 h-16 text-green-600" />
            </div>
            <div className="absolute inset-0 w-32 h-32 mx-auto bg-green-400/30 rounded-full animate-ping" />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-3xl font-bold text-gray-900">
              🎉 Herzlichen Glückwunsch!
            </h3>
            <p className="text-xl text-gray-600">
              Deine Website ist jetzt online!
            </p>
          </div>

          {/* Live URL Card */}
          <Card className="p-6 bg-gradient-to-r from-green-50 to-teal-50 border-green-200 max-w-xl mx-auto">
            <p className="text-sm text-gray-600 mb-3">Deine Website ist erreichbar unter:</p>
            <div className="flex items-center gap-3 justify-center">
              <a 
                href={publishedUrl || liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-lg font-bold text-green-700 hover:text-green-800 hover:underline"
              >
                {publishedUrl || liveUrl}
              </a>
              <ExternalLink className="w-5 h-5 text-green-600" />
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button
              onClick={() => window.open(publishedUrl || liveUrl, "_blank")}
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Eye className="mr-2 w-5 h-5" />
              Website ansehen
            </Button>
            <Button
              onClick={() => copyToClipboard(publishedUrl || liveUrl)}
              variant="outline"
              size="lg"
            >
              {copied ? <Check className="mr-2 w-5 h-5 text-green-500" /> : <Copy className="mr-2 w-5 h-5" />}
              Link kopieren
            </Button>
            <Button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: business.name,
                    url: publishedUrl || liveUrl,
                  });
                }
              }}
              variant="outline"
              size="lg"
            >
              <Share2 className="mr-2 w-5 h-5" />
              Teilen
            </Button>
          </div>

          <div className="pt-8">
            <Button
              onClick={() => (window.location.href = "/")}
              variant="ghost"
              size="lg"
              className="text-gray-600"
            >
              <Home className="mr-2 w-5 h-5" />
              Zum Dashboard
            </Button>
          </div>
        </div>
      )}

      {!isPublished && (
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
          <div></div>
        </div>
      )}
    </div>
  );
}
