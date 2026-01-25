import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowLeft,
  ChevronRight,
  Zap,
  Globe,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";

interface DomainHostingStepProps {
  nextStep: () => void;
  prevStep: () => void;
  getBaseHost?: () => string;
  getDisplayedDomain?: () => string;
}

interface SubdomainValidationResult {
  available: boolean;
  reason?: "invalid" | "reserved" | "taken" | "pending" | "owned";
  error?: string;
  suggestions?: string[];
  subdomain?: string;
  fullDomain?: string;
}

// Check subdomain availability via API
async function checkSubdomainAvailability(
  subdomain: string,
  userId?: string | null,
): Promise<SubdomainValidationResult> {
  try {
    const response = await fetch("/api/subdomains/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, userId }),
    });

    if (!response.ok) {
      throw new Error("API error");
    }

    return await response.json();
  } catch (error) {
    console.error("[Subdomain] Validation error:", error);
    return {
      available: false,
      reason: "invalid",
      error: "Fehler bei der Überprüfung. Bitte versuche es erneut.",
    };
  }
}

type ValidationStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "reserved"
  | "owned";

export function DomainHostingStep({
  nextStep,
  prevStep,
  getBaseHost,
  getDisplayedDomain,
}: DomainHostingStepProps) {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const business = useConfiguratorStore((s) => s.business);
  const actions = useConfiguratorActions();

  const [domainSearch, setDomainSearch] = useState("");
  const [availableDomains] = useState([
    { domain: "yourbusiness.com", available: true, price: "$12.99/year" },
    { domain: "yourbusiness.net", available: true, price: "$13.99/year" },
    { domain: "yourbusiness.org", available: false, price: "Taken" },
  ]);

  // Subdomain validation state
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuggestions, setValidationSuggestions] = useState<string[]>(
    [],
  );
  const [lastCheckedSubdomain, setLastCheckedSubdomain] = useState<string>("");

  const hasDomain = business.domain?.hasDomain || false;
  const domainName = business.domain?.domainName || "";
  const selectedDomain = business.domain?.selectedDomain || "";
  const baseHost = getBaseHost ? getBaseHost() : "maitr.de";

  // Generate subdomain from business name if not set
  const currentSubdomain =
    selectedDomain ||
    business.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-");

  const displayDomain = `${currentSubdomain}.${baseHost}`;

  // Debounced subdomain validation using real API
  const validateAndCheckSubdomain = useCallback(
    async (subdomain: string) => {
      if (!subdomain) {
        setValidationStatus("idle");
        setValidationError(null);
        setValidationSuggestions([]);
        return;
      }

      // Basic format check before API call
      if (subdomain.length < 3) {
        setValidationStatus("invalid");
        setValidationError("Mindestens 3 Zeichen erforderlich");
        setValidationSuggestions([]);
        return;
      }

      // Check availability via API
      setValidationStatus("checking");
      setValidationError(null);
      setValidationSuggestions([]);

      const result = await checkSubdomainAvailability(subdomain, userId);

      // Only update if this is still the current subdomain
      if (subdomain === currentSubdomain) {
        if (result.available) {
          setValidationStatus(
            result.reason === "owned" ? "owned" : "available",
          );
          setValidationError(null);
        } else {
          // Map API reason to status
          const statusMap: Record<string, ValidationStatus> = {
            invalid: "invalid",
            reserved: "reserved",
            taken: "taken",
            pending: "taken",
          };
          setValidationStatus(
            statusMap[result.reason || "invalid"] || "invalid",
          );
          setValidationError(
            result.error || "Diese Subdomain ist nicht verfügbar",
          );
          setValidationSuggestions(result.suggestions || []);
        }
        setLastCheckedSubdomain(subdomain);
      }
    },
    [currentSubdomain, userId],
  );

  // Debounce effect - also validates on mount if subdomain exists
  useEffect(() => {
    if (!hasDomain && currentSubdomain) {
      // Immediately validate if this is the first load and subdomain exists
      if (lastCheckedSubdomain === "" && validationStatus === "idle") {
        validateAndCheckSubdomain(currentSubdomain);
        return;
      }

      const timer = setTimeout(() => {
        if (currentSubdomain !== lastCheckedSubdomain) {
          validateAndCheckSubdomain(currentSubdomain);
        }
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [
    currentSubdomain,
    hasDomain,
    lastCheckedSubdomain,
    validateAndCheckSubdomain,
    validationStatus,
  ]);

  // Reset validation when switching to custom domain
  useEffect(() => {
    if (hasDomain) {
      setValidationStatus("idle");
      setValidationError(null);
    }
  }, [hasDomain]);

  // Handle subdomain input change
  const handleSubdomainChange = (value: string) => {
    // Normalize: lowercase, remove invalid chars
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");

    actions.business.setBusinessInfo({
      domain: {
        ...business.domain,
        selectedDomain: normalized,
      },
    });

    // Reset validation when typing
    if (normalized !== lastCheckedSubdomain) {
      setValidationStatus("idle");
    }
  };

  // Render validation status icon
  const renderValidationIcon = () => {
    switch (validationStatus) {
      case "checking":
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
      case "available":
      case "owned":
        return <Check className="w-5 h-5 text-green-500" />;
      case "taken":
      case "reserved":
        return <X className="w-5 h-5 text-red-500" />;
      case "invalid":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return null;
    }
  };

  // Get input border color based on status
  const getInputBorderClass = () => {
    switch (validationStatus) {
      case "available":
      case "owned":
        return "border-green-500 focus:border-green-500 focus:ring-green-500";
      case "taken":
      case "reserved":
      case "invalid":
        return "border-red-500 focus:border-red-500 focus:ring-red-500";
      default:
        return "";
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {t("steps.domainHosting.title")}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t("steps.domainHosting.subtitle")}
        </p>
      </div>

      <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              !hasDomain
                ? "border-teal-500 bg-teal-50"
                : "border-gray-200 hover:border-teal-300"
            }`}
            onClick={() =>
              actions.business.setBusinessInfo({
                domain: { ...business.domain, hasDomain: false },
              })
            }
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t("domain.freeSubdomain")}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {t("domain.freeSubdomainDesc")}
              </p>
              <div className="text-green-600 font-bold">{t("domain.free")}</div>
              {!hasDomain && (
                <div className="mt-2">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              hasDomain
                ? "border-teal-500 bg-teal-50"
                : "border-gray-200 hover:border-teal-300"
            }`}
            onClick={() =>
              actions.business.setBusinessInfo({
                domain: { ...business.domain, hasDomain: true },
              })
            }
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t("domain.customDomain")}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {t("domain.customDomainDesc")}
              </p>
              <div className="text-blue-600 font-bold">
                {t("domain.fromPrice")}
              </div>
              {hasDomain && (
                <div className="mt-2">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FREE SUBDOMAIN SECTION */}
        {!hasDomain && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Deine kostenlose Website-URL
            </h3>

            {/* Subdomain Input with Validation */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="dein-geschaeft"
                    value={currentSubdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    className={`pr-10 font-mono ${getInputBorderClass()}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon()}
                  </div>
                </div>
                <span className="text-gray-500 font-mono text-sm shrink-0">
                  .{baseHost}
                </span>
              </div>

              {/* Validation Message */}
              {validationError && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    validationStatus === "taken" ||
                    validationStatus === "reserved"
                      ? "text-red-600"
                      : "text-orange-600"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {validationStatus === "available" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Diese Subdomain ist verfügbar!</span>
                </div>
              )}

              {validationStatus === "owned" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Diese Subdomain gehört bereits Ihnen</span>
                </div>
              )}

              {validationStatus === "checking" && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  <span>Verfügbarkeit wird geprüft...</span>
                </div>
              )}

              {/* Preview URL */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">
                  Deine Website wird verfügbar sein unter:
                </p>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-500" />
                  <span
                    className={`font-mono text-sm font-medium ${
                      validationStatus === "available" ||
                      validationStatus === "owned"
                        ? "text-green-700"
                        : validationStatus === "taken" ||
                            validationStatus === "reserved" ||
                            validationStatus === "invalid"
                          ? "text-red-700"
                          : "text-gray-700"
                    }`}
                  >
                    https://{displayDomain}
                  </span>
                </div>
              </div>

              {/* Suggestions if taken/reserved (from API) */}
              {(validationStatus === "taken" ||
                validationStatus === "reserved") &&
                validationSuggestions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Alternativen:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {validationSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSubdomainChange(suggestion)}
                          className="px-3 py-1.5 text-xs font-mono bg-white border border-blue-200 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          {suggestion}.{baseHost}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </Card>
        )}

        {/* CUSTOM DOMAIN SECTION */}
        {hasDomain && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Eigene Domain verbinden
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Deine Domain eingeben
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder="z.B. mein-restaurant.de"
                      value={domainName}
                      onChange={(e) =>
                        actions.business.setBusinessInfo({
                          domain: {
                            ...business.domain,
                            domainName: e.target.value,
                          },
                        })
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (domainName) {
                          alert(
                            `Domain ${domainName} ist bereit zur Verbindung!`,
                          );
                        }
                      }}
                    >
                      Prüfen
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Gib eine Domain ein, die du bereits besitzt
                  </p>
                </div>

                {domainName && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      DNS-Konfiguration erforderlich
                    </h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Um deine Domain zu verbinden, füge diese DNS-Einträge
                      hinzu:
                    </p>
                    <div className="bg-white rounded border font-mono text-xs p-3 space-y-1">
                      <div>
                        <strong>A Record:</strong> @ → 76.76.19.61
                      </div>
                      <div>
                        <strong>CNAME:</strong> www → your-site.{baseHost}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Oder neue Domain suchen
              </h3>
              <div className="flex space-x-2 mb-4">
                <Input
                  type="text"
                  placeholder="Domain-Name eingeben"
                  value={domainSearch}
                  onChange={(e) => setDomainSearch(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline">Suchen</Button>
              </div>

              <div className="space-y-3">
                {availableDomains.map((domain, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${domain.available ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="font-mono font-medium">
                        {domain.domain}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-sm ${domain.available ? "text-green-600" : "text-red-600"}`}
                      >
                        {domain.price}
                      </span>
                      {domain.available && (
                        <Button
                          size="sm"
                          className="bg-teal-500 hover:bg-teal-600"
                          onClick={() =>
                            actions.business.setBusinessInfo({
                              domain: {
                                ...business.domain,
                                domainName: domain.domain,
                              },
                            })
                          }
                        >
                          {t("domain.select")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-purple-600" />
                Automatische Domain-Verwaltung
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Wir integrieren mit führenden Domain- und Hosting-Anbietern:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 text-sm mb-1">
                    Vercel
                  </h4>
                  <p className="text-xs text-gray-600">
                    Auto-Deploy & Custom Domains
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 text-sm mb-1">
                    Netlify
                  </h4>
                  <p className="text-xs text-gray-600">Edge Functions & DNS</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 text-sm mb-1">
                    CloudFlare
                  </h4>
                  <p className="text-xs text-gray-600">CDN & Sicherheit</p>
                </div>
              </div>
            </Card>
          </div>
        )}
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
        <Button
          onClick={nextStep}
          disabled={
            // Only disable if using free subdomain AND subdomain is invalid/taken
            !hasDomain &&
            currentSubdomain.length > 0 &&
            (validationStatus === "taken" || validationStatus === "invalid")
          }
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
