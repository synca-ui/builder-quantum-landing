import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Rocket,
  Check,
  Eye,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { AuthGateModal } from "@/components/AuthGateModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
// Fortschritt und Erfolgsansicht liegen gemeinsam in client/components/publish:
// Der automatische Modus veröffentlicht ebenfalls und zeigt dieselbe Ansicht.
import {
  PublishingProgress,
  SuccessView,
} from "@/components/publish/PublishSuccess";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { deploy, type DeploymentStage } from "@/lib/deployment";
import type { Configuration } from "@/types/domain";

interface PublishStepProps {
  prevStep: () => void;
  getLiveUrl?: () => string;
  configId: string | null;
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
  configId,
}: PublishStepProps) {
  const { t } = useTranslation();
  const { getToken, isSignedIn } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentStage, setCurrentStage] =
    useState<DeploymentStage>("validating");
  const [publishError, setPublishError] = useState<string | undefined>();

  const fullState = useConfiguratorStore((s) => s);
  const actions = useConfiguratorActions();

  const business = fullState.business;
  const design = fullState.design;
  const content = fullState.content;
  const contact = fullState.contact;
  const publishing = fullState.publishing;

  const wasAlreadyPublished =
    publishing.status === "published" && !!publishing.publishedUrl;

  const displayDomain = useMemo(() => {
    if (getDisplayedDomain) return getDisplayedDomain();

    const name =
      business.domain?.selectedDomain ||
      business.name.toLowerCase().replace(/[^a-z0-9]/g, "-");

    return name.includes(".") ? name : `${name}.maitr.de`;
  }, [getDisplayedDomain, business.domain?.selectedDomain, business.name]);

  const liveUrl = getLiveUrl
    ? getLiveUrl()
    : publishing.publishedUrl || `https://${displayDomain}`;

  // Comprehensive checklist
  const checklist: ChecklistItem[] = useMemo(
    () => [
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
        description: business.type
          ? `${business.type.charAt(0).toUpperCase()}${business.type.slice(1)}`
          : "Nicht ausgewählt",
        checked: !!business.type,
        required: true,
        category: "business",
      },
      {
        id: "design-template",
        label: "Template ausgewählt",
        description: design.template
          ? `${design.template.charAt(0).toUpperCase()}${design.template.slice(1)}`
          : "Nicht ausgewählt",
        checked: !!design.template,
        required: true,
        category: "design",
      },
      {
        id: "domain-selected",
        label: "Domain / Subdomain",
        description: displayDomain,
        checked:
          !!business.domain?.selectedDomain || !!business.domain?.domainName,
        required: true,
        category: "domain",
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
        id: "content-menu",
        label: "Speisekarte / Produkte",
        description:
          content.menuItems.length > 0
            ? `${content.menuItems.length} Artikel`
            : "Keine Artikel",
        checked: content.menuItems.length > 0,
        required: false,
        category: "content",
      },
      {
        id: "contact-info",
        label: "Kontaktdaten",
        description: contact.email || contact.phone || "Nicht angegeben",
        checked: !!contact.email || !!contact.phone,
        required: false,
        category: "contact",
      },
      {
        id: "content-gallery",
        label: "Bildergalerie",
        description:
          content.gallery.length > 0
            ? `${content.gallery.length} Bilder`
            : "Keine Bilder",
        checked: content.gallery.length > 0,
        required: false,
        category: "content",
      },
    ],
    [
      business.name,
      business.type,
      design.template,
      business.domain?.selectedDomain,
      business.domain?.domainName,
      business.location,
      content.menuItems.length,
      contact.email,
      contact.phone,
      content.gallery.length,
    ],
  );

  const requiredItems = checklist.filter((item) => item.required);
  const completedRequired = requiredItems.filter((item) => item.checked);
  const allItems = checklist;
  const completedAll = allItems.filter((item) => item.checked);

  const requiredProgress = Math.round(
    (completedRequired.length / requiredItems.length) * 100,
  );
  const overallProgress = Math.round(
    (completedAll.length / allItems.length) * 100,
  );

  const canPublish = completedRequired.length === requiredItems.length;

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(undefined);
    setCurrentStage("validating");

    try {
      // 1. Daten und Token holen
      const configData = actions.data.getFullConfiguration();
      const token = await getToken();

      // 2. Subdomain sauber extrahieren (nur den Teil vor dem Punkt)
      const rawSubdomain =
        business.domain?.selectedDomain ||
        business.name.toLowerCase().replace(/[^a-z0-9]/g, "-");

      const subdomain = rawSubdomain.split(".")[0].substring(0, 63);

      // 3. Deployment starten
      const result = await deploy({
        subdomain,
        config: configData,
        configId: configId, // FIX: Nutze die Prop 'configId' statt fullState.id
        token: token || undefined,
        onProgress: (stage) => {
          setCurrentStage(stage);
        },
      });

      if (result.success && result.publishedUrl) {
        setPublishedUrl(result.publishedUrl);
        setIsPublished(true);

        // Store aktualisieren
        actions.publishing.updatePublishingInfo({
          status: "published",
          publishedUrl: result.publishedUrl,
          previewUrl: result.previewUrl,
          publishedAt: result.publishedAt || new Date().toISOString(),
        });

        // 4. Backend-Sync (FIX für TS2353 durch Casting auf any)
        if (saveToBackend) {
          try {
            await saveToBackend({
              ...configData,
              status: "published", // Falls das im Typ fehlt, hilft das any im Interface
              publishedUrl: result.publishedUrl,
            } as any);
          } catch (e) {
            console.warn("Backend save failed:", e);
          }
        }
      } else {
        setPublishError(result.error || "Veröffentlichung fehlgeschlagen");
        setCurrentStage("error");
      }
    } catch (error) {
      console.error("Publishing failed:", error);
      setPublishError(
        error instanceof Error ? error.message : "Unbekannter Fehler",
      );
      setCurrentStage("error");
    } finally {
      if (!isPublished) {
        setTimeout(() => {
          if (currentStage === "error") setIsPublishing(false);
        }, 2000);
      }
    }
    // FIX: Dependency Array aktualisiert
  }, [
    getToken,
    saveToBackend,
    isPublished,
    currentStage,
    actions.data,
    business.domain.selectedDomain,
    business.name,
    actions.publishing,
    configId,
  ]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "business":
        return "bg-blue-100 text-blue-700";
      case "design":
        return "bg-purple-100 text-purple-700";
      case "content":
        return "bg-orange-100 text-orange-700";
      case "contact":
        return "bg-green-100 text-green-700";
      case "domain":
        return "bg-teal-100 text-teal-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Publishing state - show progress
  if (isPublishing && !isPublished) {
    return (
      <div className="py-8 max-w-2xl mx-auto">
        <PublishingProgress currentStage={currentStage} error={publishError} />

        {publishError && (
          <div className="mt-6 flex justify-center gap-4">
            <Button
              onClick={() => {
                setIsPublishing(false);
                setPublishError(undefined);
              }}
              variant="outline"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Zurück
            </Button>
            <Button onClick={handlePublish}>Erneut versuchen</Button>
          </div>
        )}
      </div>
    );
  }

  // Success state
  if (isPublished) {
    return (
      <div className="py-8 max-w-4xl mx-auto">
        <SuccessView
          publishedUrl={publishedUrl || liveUrl}
          businessName={business.name}
          onCopy={copyToClipboard}
          copied={copied}
        />
      </div>
    );
  }

  // Default state - pre-publish checklist
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

      <div className="space-y-8">
        {/* Already Published Banner */}
        {wasAlreadyPublished && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-900">
                  Web-App bereits veröffentlicht
                </p>
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
                    Zuletzt veröffentlicht:{" "}
                    {new Date(publishing.publishedAt).toLocaleString("de-DE")}
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
              <span
                className={`text-2xl font-bold ${canPublish ? "text-green-600" : "text-orange-600"}`}
              >
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
                  Bitte fülle alle mit * markierten Felder aus, bevor du
                  veröffentlichst.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Checklist */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Check className="w-5 h-5 text-teal-500" />
            Checkliste vor Veröffentlichung
          </h3>

          <div className="grid gap-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${item.checked
                    ? "bg-green-50 border-green-200"
                    : item.required
                      ? "bg-orange-50 border-orange-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.checked
                      ? "bg-green-500"
                      : item.required
                        ? "bg-orange-300"
                        : "bg-gray-300"
                    }`}
                >
                  {item.checked && <Check className="w-4 h-4 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-medium ${item.checked ? "text-green-900" : "text-gray-900"}`}
                    >
                      {item.label}
                      {item.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(item.category)}`}
                    >
                      {item.category.charAt(0).toUpperCase() +
                        item.category.slice(1)}
                    </span>
                  </div>
                  {item.description && (
                    <p
                      className={`text-sm truncate ${item.checked ? "text-green-700" : "text-gray-500"}`}
                    >
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
            Deine Web-App-URL
          </h3>
          <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">
              Deine Web-App wird verfügbar sein unter:
            </p>
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
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Publish Button */}
        <div className="text-center pt-4">
          <Button
            onClick={() => {
              if (!isSignedIn) {
                setShowAuthModal(true);
              } else {
                handlePublish();
              }
            }}
            disabled={isPublishing || !canPublish}
            size="lg"
            className={`px-12 py-6 text-xl font-bold rounded-full shadow-2xl transition-all duration-300 ${canPublish
                ? "bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 hover:scale-105"
                : "bg-gray-300 cursor-not-allowed"
              }`}
          >
            <Rocket className="mr-3 w-6 h-6" />
            Web-App veröffentlichen
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            {canPublish
              ? "Deine Web-App ist in wenigen Sekunden online!"
              : "Bitte fülle alle Pflichtfelder aus"}
          </p>
        </div>
      </div>

      {/* Auth Gate Modal – shown when unauthenticated user tries to publish */}
      <AuthGateModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        headline="Login erforderlich zum Veröffentlichen"
        subline="Erstelle ein kostenloses Konto oder melde dich an, um deine Web-App live zu schalten und dauerhaft zu speichern."
        redirectUrl={window.location.pathname}
      />

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
    </div>
  );
}
