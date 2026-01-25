import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Rocket,
  Check,
  Eye,
  Home,
  AlertCircle,
  ExternalLink,
  Copy,
  Share2,
  Sparkles,
  Globe,
  Database,
  Route,
  PartyPopper,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { deploy, type DeploymentStage } from "@/lib/deployment";
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

// Progress stage configuration
const PUBLISH_STAGES: {
  stage: DeploymentStage;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    stage: "validating",
    label: "Daten werden versiegelt...",
    icon: <Database className="w-5 h-5" />,
  },
  {
    stage: "checking_subdomain",
    label: "Subdomain wird geprüft...",
    icon: <Globe className="w-5 h-5" />,
  },
  {
    stage: "persisting",
    label: "Konfiguration wird gespeichert...",
    icon: <Database className="w-5 h-5" />,
  },
  {
    stage: "routing",
    label: "Subdomain wird geroutet...",
    icon: <Route className="w-5 h-5" />,
  },
  {
    stage: "complete",
    label: "Deine Website geht live!",
    icon: <Sparkles className="w-5 h-5" />,
  },
];

// Confetti component
const Confetti = memo(function Confetti() {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      delay: number;
      color: string;
      size: number;
    }>
  >([]);

  useEffect(() => {
    const colors = [
      "#14b8a6",
      "#a855f7",
      "#f97316",
      "#22c55e",
      "#3b82f6",
      "#ec4899",
    ];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: "-20px",
            animationDelay: `${p.delay}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
});

// Publishing progress component
const PublishingProgress = memo(function PublishingProgress({
  currentStage,
  error,
}: {
  currentStage: DeploymentStage;
  error?: string;
}) {
  const currentIndex = PUBLISH_STAGES.findIndex(
    (s) => s.stage === currentStage,
  );
  const progress =
    currentStage === "error"
      ? 0
      : ((currentIndex + 1) / PUBLISH_STAGES.length) * 100;

  return (
    <Card className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-teal-500 to-purple-500 flex items-center justify-center animate-pulse">
          <Rocket className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Website wird veröffentlicht</h3>
        <p className="text-slate-400">Bitte warte einen Moment...</p>
      </div>

      <div className="space-y-4 mb-8">
        {PUBLISH_STAGES.filter((s) => s.stage !== "error").map(
          (stage, index) => {
            const isActive = stage.stage === currentStage;
            const isComplete = currentIndex > index;
            const isPending = currentIndex < index;

            return (
              <div
                key={stage.stage}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-white/10 scale-105"
                    : isComplete
                      ? "bg-green-500/20"
                      : "bg-white/5 opacity-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isComplete
                      ? "bg-green-500"
                      : isActive
                        ? "bg-gradient-to-r from-teal-500 to-purple-500 animate-pulse"
                        : "bg-slate-600"
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span className={isActive ? "animate-spin-slow" : ""}>
                      {stage.icon}
                    </span>
                  )}
                </div>
                <span
                  className={`font-medium ${isActive ? "text-white" : isComplete ? "text-green-400" : "text-slate-400"}`}
                >
                  {stage.label}
                </span>
              </div>
            );
          },
        )}
      </div>

      <Progress value={progress} className="h-2 bg-slate-700" />

      {error && (
        <div className="mt-6 p-4 bg-red-500/20 rounded-lg border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </Card>
  );
});

// Success view component
const SuccessView = memo(function SuccessView({
  publishedUrl,
  businessName,
  onCopy,
  copied,
}: {
  publishedUrl: string;
  businessName: string;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="w-32 h-32 mx-auto bg-gradient-to-r from-green-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
            <PartyPopper className="w-16 h-16 text-white" />
          </div>
          <div className="absolute inset-0 w-32 h-32 mx-auto bg-green-400/30 rounded-full animate-ping" />
        </div>

        <div className="space-y-4">
          <h3 className="text-4xl font-bold bg-gradient-to-r from-green-500 via-teal-500 to-purple-500 bg-clip-text text-transparent">
            🎉 Herzlichen Glückwunsch!
          </h3>
          <p className="text-xl text-gray-600">
            Deine Website ist jetzt online!
          </p>
        </div>

        {/* Live URL Card */}
        <Card className="p-8 bg-gradient-to-r from-green-50 via-teal-50 to-purple-50 border-2 border-green-200 max-w-2xl mx-auto shadow-xl">
          <p className="text-sm text-gray-600 mb-4 font-medium">
            Deine Website ist erreichbar unter:
          </p>
          <div className="bg-white rounded-xl p-4 border border-green-200 mb-6">
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xl md:text-2xl font-bold text-green-700 hover:text-green-800 hover:underline flex items-center justify-center gap-2"
            >
              {publishedUrl}
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => window.open(publishedUrl, "_blank")}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg"
            >
              <Eye className="mr-2 w-5 h-5" />
              Website ansehen
            </Button>
            <Button
              onClick={() => onCopy(publishedUrl)}
              variant="outline"
              size="lg"
              className="border-2"
            >
              {copied ? (
                <Check className="mr-2 w-5 h-5 text-green-500" />
              ) : (
                <Copy className="mr-2 w-5 h-5" />
              )}
              {copied ? "Kopiert!" : "Link kopieren"}
            </Button>
            <Button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: businessName,
                    url: publishedUrl,
                  });
                } else {
                  onCopy(publishedUrl);
                }
              }}
              variant="outline"
              size="lg"
              className="border-2"
            >
              <Share2 className="mr-2 w-5 h-5" />
              Teilen
            </Button>
          </div>
        </Card>

        <div className="pt-4">
          <Button
            onClick={() => (window.location.href = "/")}
            variant="ghost"
            size="lg"
            className="text-gray-600 hover:text-gray-900"
          >
            <Home className="mr-2 w-5 h-5" />
            Zum Dashboard
          </Button>
        </div>
      </div>
    </>
  );
});

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

  const displayDomain = getDisplayedDomain
    ? getDisplayedDomain()
    : `${
        business.domain?.selectedDomain ||
        business.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      }.maitr.de`;

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
    [business, design, content, contact, displayDomain],
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
      const configData = actions.data.getFullConfiguration();
      const token = await getToken();

      const subdomain = (
        business.domain?.selectedDomain ||
        business.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      ).substring(0, 63);

      // Deploy with progress tracking
      const result = await deploy({
        subdomain,
        config: configData,
        configId: fullState.id,
        token: token || undefined,
        onProgress: (stage, _message) => {
          setCurrentStage(stage);
        },
      });

      if (result.success && result.publishedUrl) {
        setPublishedUrl(result.publishedUrl);
        setIsPublished(true);

        // Update store
        actions.publishing.updatePublishingInfo({
          status: "published",
          publishedUrl: result.publishedUrl,
          previewUrl: result.previewUrl,
          publishedAt: result.publishedAt || new Date().toISOString(),
        });

        // Also save to backend if provided
        if (saveToBackend) {
          try {
            await saveToBackend({
              ...configData,
              status: "published",
              publishedUrl: result.publishedUrl,
            });
          } catch (e) {
            console.warn("Backend save after publish failed:", e);
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
        // Only reset publishing if we didn't succeed
        setTimeout(() => {
          if (currentStage === "error") {
            setIsPublishing(false);
          }
        }, 2000);
      }
    }
  }, [
    actions,
    business,
    fullState.id,
    getToken,
    saveToBackend,
    isPublished,
    currentStage,
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
                  Website bereits veröffentlicht
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
                className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                  item.checked
                    ? "bg-green-50 border-green-200"
                    : item.required
                      ? "bg-orange-50 border-orange-200"
                      : "bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    item.checked
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
            Deine Website-URL
          </h3>
          <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">
              Deine Website wird verfügbar sein unter:
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
            onClick={handlePublish}
            disabled={isPublishing || !canPublish}
            size="lg"
            className={`px-12 py-6 text-xl font-bold rounded-full shadow-2xl transition-all duration-300 ${
              canPublish
                ? "bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 hover:scale-105"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            <Rocket className="mr-3 w-6 h-6" />
            Website veröffentlichen
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            {canPublish
              ? "Deine Website ist in wenigen Sekunden online!"
              : "Bitte fülle alle Pflichtfelder aus"}
          </p>
        </div>
      </div>

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
