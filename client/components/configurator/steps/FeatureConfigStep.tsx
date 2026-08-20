import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { useAuth } from "@clerk/clerk-react";
import { uploadImageFile } from "@/lib/mediaUpload";

interface FeatureConfigStepProps {
  nextStep: () => void;
  prevStep: () => void;
  pendingFeatureConfig: string | null;
  setPendingFeatureConfig: (feature: string | null) => void;
  setCurrentStep?: (step: number) => void;
  configuratorSteps?: any[];
}

export function FeatureConfigStep({
  nextStep,
  prevStep,
  pendingFeatureConfig,
  setPendingFeatureConfig,
  setCurrentStep,
  configuratorSteps,
}: FeatureConfigStepProps) {
  const { t } = useTranslation();
  const storeState = useConfiguratorStore((s) => s);
  const actions = useConfiguratorActions();

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Frueher stand hier ein useEffect, das bei leerem pendingFeatureConfig
  // selbst nextStep() aufrief. Das hatte zwei Folgen:
  //   1. finish() setzte pending auf null UND rief nextStep() — der Effect
  //      sprang ein zweites Mal weiter, "Domain waehlen" wurde uebersprungen.
  //   2. Wer von "Domain waehlen" zurueckging, landete hier und wurde sofort
  //      wieder vorgeschoben — der Zurueck-Button wirkte tot.
  // Das Ueberspringen dieses Schritts ohne offene Feature-Konfiguration
  // erledigt jetzt die Navigation im Configurator (nextStep/prevStep).

  const finish = () => {
    setPendingFeatureConfig(null);
    nextStep();
  };

  const goBack = () => {
    setPendingFeatureConfig(null);
    if (setCurrentStep && configuratorSteps) {
      const idx = configuratorSteps.findIndex(
        (s) => s.id === "advanced-features",
      );
      if (idx !== -1) setCurrentStep(idx);
    } else {
      prevStep();
    }
  };

  const updateFeatureData = (key: string, value: any) => {
    actions.features.updateFeatureFlags({ [key]: value } as any);
  };

  const render = () => {
    switch (pendingFeatureConfig) {
      case "onlineOrderingEnabled":
        return (
          <Card className="p-6">
            <h4 className="text-lg font-bold mb-3">
              Online-Bestellung einrichten
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Kassensystem (POS)
                </label>
                <select
                  value={(storeState.features as any).posProvider || "none"}
                  onChange={(e) =>
                    updateFeatureData("posProvider", e.target.value)
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="none">Keins</option>
                  <option value="sumup">SumUp</option>
                  <option value="shopify">Shopify POS</option>
                  <option value="local">Lokales Kassensystem</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Zahlungsarten
                </label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(["applePay", "googlePay", "card", "cash"] as const).map(
                    (k) => (
                      <label
                        key={k}
                        className="inline-flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={
                            !!(storeState.features as any).paymentMethods?.[k]
                          }
                          onChange={(e) =>
                            updateFeatureData("paymentMethods", {
                              ...((storeState.features as any).paymentMethods ||
                                {}),
                              [k]: e.target.checked,
                            })
                          }
                        />
                        <span>
                          {
                            {
                              applePay: "Apple Pay",
                              googlePay: "Google Pay",
                              card: "Karte",
                              cash: "Bar",
                            }[k]
                          }
                        </span>
                      </label>
                    ),
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Bestellwege
                </label>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {(["delivery", "pickup", "table"] as const).map((k) => (
                    <label
                      key={k}
                      className="inline-flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={
                          !!(storeState.features as any).orderOptions?.[k]
                        }
                        onChange={(e) =>
                          updateFeatureData("orderOptions", {
                            ...((storeState.features as any).orderOptions ||
                              {}),
                            [k]: e.target.checked,
                          })
                        }
                      />
                      <span>
                        {
                          {
                            delivery: "Lieferung",
                            pickup: "Abholung",
                            table: "Am Tisch",
                          }[k]
                        }
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={
                      !!(storeState.features as any).deliveryAddressRequired
                    }
                    onChange={(e) =>
                      updateFeatureData(
                        "deliveryAddressRequired",
                        e.target.checked,
                      )
                    }
                  />
                  <span>Lieferadresse bei Lieferbestellungen verlangen</span>
                </label>
              </div>
            </div>
          </Card>
        );

      case "onlineStoreEnabled":
        return (
          <Card className="p-6">
            <h4 className="text-lg font-bold mb-3">Online Store Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Categories
                </label>
                <div className="flex items-center space-x-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Add category"
                    onKeyDown={(e) => {
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (e.key === "Enter" && v) {
                        actions.content.setCategories([
                          ...(storeState.content.categories || []),
                          v,
                        ]);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500">Press Enter</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(storeState.content.categories || []).map(
                    (c: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 rounded text-xs"
                      >
                        {c}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">
                  Options
                </label>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!(storeState.features as any).showStockLevels}
                    onChange={(e) =>
                      updateFeatureData("showStockLevels", e.target.checked)
                    }
                  />
                  <span>Show stock levels</span>
                </label>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!(storeState.features as any).discountsEnabled}
                    onChange={(e) =>
                      updateFeatureData("discountsEnabled", e.target.checked)
                    }
                  />
                  <span>Enable discounts</span>
                </label>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!(storeState.features as any).bundlesEnabled}
                    onChange={(e) =>
                      updateFeatureData("bundlesEnabled", e.target.checked)
                    }
                  />
                  <span>Enable bundles</span>
                </label>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={
                      !!(storeState.features as any).seasonalOffersEnabled
                    }
                    onChange={(e) =>
                      updateFeatureData(
                        "seasonalOffersEnabled",
                        e.target.checked,
                      )
                    }
                  />
                  <span>Enable seasonal offers</span>
                </label>
              </div>
            </div>
          </Card>
        );

      case "teamAreaEnabled":
        return (
          <Card className="p-6">
            <h4 className="text-lg font-bold mb-3">Team-Bereich einrichten</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  type="text"
                  placeholder="z.B. Alex"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const name = (e.target as HTMLInputElement).value.trim();
                      if (name) {
                        updateFeatureData("teamMembers", [
                          ...((storeState.features as any).teamMembers || []),
                          { name, role: "", status: "on_duty" },
                        ]);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Mit Enter hinzufügen
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Schnell-Rollen
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(
                    [
                      ["chef", "Koch"],
                      ["barista", "Barista"],
                      ["waiter", "Service"],
                    ] as const
                  ).map(([r, label]) => (
                    <button
                      key={r}
                      className="px-2 py-1 border rounded"
                      onClick={() => {
                        const members =
                          (storeState.features as any).teamMembers || [];
                        // Keine stillen Duplikate: dieselbe Rolle nur einmal
                        // per Schnell-Knopf anlegen.
                        if (
                          members.some((m: any) => m.role === r)
                        ) {
                          return;
                        }
                        updateFeatureData("teamMembers", [
                          ...members,
                          { name: label, role: r, status: "off_duty" },
                        ]);
                      }}
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sichtbare Teamliste — vorher landeten Mitglieder nur im Store
                und waren weder sichtbar noch löschbar. */}
            {((storeState.features as any).teamMembers || []).length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium">Dein Team</label>
                {((storeState.features as any).teamMembers || []).map(
                  (m: any, idx: number) => (
                    <div
                      key={`${m.name}-${idx}`}
                      className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{m.name}</span>
                        {m.role && (
                          <span className="ml-2 text-gray-500">
                            {(
                              {
                                chef: "Koch",
                                barista: "Barista",
                                waiter: "Service",
                              } as Record<string, string>
                            )[m.role] || m.role}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`${m.name} entfernen`}
                        onClick={() =>
                          updateFeatureData(
                            "teamMembers",
                            (
                              (storeState.features as any).teamMembers || []
                            ).filter((_: any, i: number) => i !== idx),
                          )
                        }
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ),
                )}
              </div>
            )}
          </Card>
        );

      case "loyaltyEnabled":
        return (
          <Card className="p-6">
            <h4 className="text-lg font-bold mb-3">Loyalty / Stamp Card</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Stamps for reward
                </label>
                <Input
                  type="number"
                  value={
                    (storeState.features as any).loyaltyConfig
                      ?.stampsForReward || 10
                  }
                  onChange={(e) =>
                    updateFeatureData("loyaltyConfig", {
                      ...((storeState.features as any).loyaltyConfig || {}),
                      stampsForReward: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reward type
                </label>
                <select
                  value={
                    (storeState.features as any).loyaltyConfig?.rewardType ||
                    "discount"
                  }
                  onChange={(e) =>
                    updateFeatureData("loyaltyConfig", {
                      ...((storeState.features as any).loyaltyConfig || {}),
                      rewardType: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="discount">Discount</option>
                  <option value="free_item">Free Item</option>
                  <option value="voucher">Voucher</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Expiration date
                </label>
                <Input
                  type="date"
                  value={
                    (storeState.features as any).loyaltyConfig?.expiryDate || ""
                  }
                  onChange={(e) =>
                    updateFeatureData("loyaltyConfig", {
                      ...((storeState.features as any).loyaltyConfig || {}),
                      expiryDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </Card>
        );

      case "couponsEnabled":
        return (
          <Card className="p-6">
            <h4 className="text-lg font-bold mb-3">Coupons / Vouchers</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select id="coupon-type-step" className="border rounded p-2">
                  <option value="amount">Fixed Amount</option>
                  <option value="percent">Percentage</option>
                  <option value="bogo">2-for-1</option>
                </select>
                <Input id="coupon-value-step" type="text" placeholder="Value" />
                <Input
                  id="coupon-conditions-step"
                  type="text"
                  placeholder="Conditions"
                />
                <Button
                  onClick={() => {
                    const type = (
                      document.getElementById(
                        "coupon-type-step",
                      ) as HTMLSelectElement
                    ).value;
                    const value = (
                      document.getElementById(
                        "coupon-value-step",
                      ) as HTMLInputElement
                    ).value;
                    const conditions = (
                      document.getElementById(
                        "coupon-conditions-step",
                      ) as HTMLInputElement
                    ).value;
                    if (value) {
                      updateFeatureData("coupons", [
                        ...((storeState.features as any).coupons || []),
                        { type, value, conditions },
                      ]);
                      (
                        document.getElementById(
                          "coupon-value-step",
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "coupon-conditions-step",
                        ) as HTMLInputElement
                      ).value = "";
                    }
                  }}
                >
                  Add Coupon
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {((storeState.features as any).coupons || []).map(
                  (c: any, i: number) => (
                    <div key={i} className="p-3 border rounded">
                      <div className="text-sm font-semibold">
                        {c.type} - {c.value}
                      </div>
                      <div className="text-xs text-gray-600">
                        {c.conditions}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </Card>
        );

      case "offersEnabled":
        return (
          <OffersStep
            onBack={goBack}
            onContinue={finish}
            storeState={storeState}
            actions={actions}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t("steps.featureConfig.title")}
        </h2>
      </div>
      {render()}
      <div className="flex justify-between mt-8">
        <Button onClick={goBack} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          {t("common.back")}
        </Button>
        <Button
          onClick={finish}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          {t("common.saveAndContinue")}
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

interface OffersStepProps {
  onBack?: () => void;
  onContinue?: () => void;
  storeState: any;
  actions: any;
}

function OffersStep({
  onBack,
  onContinue,
  storeState,
  actions,
}: OffersStepProps) {
  const { getToken } = useAuth();
  const [newOffer, setNewOffer] = useState({
    name: "",
    description: "",
    price: "",
    image: null as any,
  });

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addOffer = () => {
    if (!isMountedRef.current) return;
    if (newOffer.name && newOffer.price) {
      const updatedOffers = [
        ...((storeState.payments as any).offers || []),
        { ...newOffer, id: Date.now().toString() },
      ];
      actions.payments.updatePaymentsAndOffers({ offers: updatedOffers });
      setNewOffer({ name: "", description: "", price: "", image: null });
    }
  };

  const removeOffer = (index: number) => {
    if (!isMountedRef.current) return;
    const updatedOffers = ((storeState.payments as any).offers || []).filter(
      (_: any, i: number) => i !== index,
    );
    actions.payments.updatePaymentsAndOffers({ offers: updatedOffers });
  };

  const handleImageForNew = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    // Dauerhafte Storage-URL statt data:-URL: Letztere überlebte zwar das
    // Veröffentlichen, blähte die Konfiguration aber um ganze Bilddateien auf.
    void (async () => {
      try {
        const url = await uploadImageFile(file, await getToken());
        setNewOffer((prev) => ({ ...prev, image: url }));
      } catch (e) {
        console.error("[Offers] Upload fehlgeschlagen:", e);
      }
    })();
  };

  const offers = (storeState.payments as any).offers || [];
  const offerBanner = (storeState.payments as any).offerBanner || {};

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Deine Angebote anlegen
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Lege Sonderangebote und Aktionen an, die Gäste anziehen.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-lg border mb-8">
        <h3 className="text-xl font-bold mb-6">Neues Angebot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            placeholder="Name des Angebots (z.B. Mittagsmenü)"
            value={newOffer.name}
            onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })}
          />
          <Input
            placeholder="Preis (z.B. 9,99)"
            value={newOffer.price}
            onChange={(e) =>
              setNewOffer({ ...newOffer, price: e.target.value })
            }
          />
          <Textarea
            placeholder="Beschreibung"
            value={newOffer.description}
            onChange={(e) =>
              setNewOffer({ ...newOffer, description: e.target.value })
            }
            className="md:col-span-2"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Angebotsbild
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageForNew(e.target.files)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            {newOffer.image && (
              <img
                src={newOffer.image as string}
                alt="preview"
                className="mt-4 w-32 h-32 object-cover rounded-lg"
              />
            )}
          </div>
        </div>
        <div className="mt-6 text-right">
          <Button onClick={addOffer}>Angebot hinzufügen</Button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-lg border mt-8">
        <h3 className="text-xl font-bold mb-2">Angebots-Banner anpassen</h3>
        <p className="text-sm text-gray-500 mb-6">
          Zeigt dein erstes Angebot direkt auf der Startseite — ein Klick
          führt zur Angebote-Seite.
        </p>

        <div className="flex items-center gap-3 mb-6">
          <Switch
            id="offer-banner-enabled"
            checked={!!offerBanner.enabled}
            onCheckedChange={(v) =>
              actions.payments.updatePaymentsAndOffers({
                offerBanner: { ...offerBanner, enabled: v },
              })
            }
          />
          <label htmlFor="offer-banner-enabled" className="text-sm text-gray-700">
            Banner auf der Startseite anzeigen
          </label>
        </div>

        {!!offerBanner.enabled && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bannergröße
              </label>
              <div className="flex gap-2">
                {(
                  [
                    ["small", "Klein"],
                    ["medium", "Mittel"],
                    ["large", "Groß"],
                  ] as const
                ).map(([val, label]) => {
                  const active = (offerBanner.size || "medium") === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        active
                          ? "bg-teal-500 text-white border-teal-500 shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"
                      }`}
                      onClick={() =>
                        actions.payments.updatePaymentsAndOffers({
                          offerBanner: { ...offerBanner, size: val },
                        })
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Klein: schmale Zeile · Mittel: Karte · Groß: mit Bild und Knopf
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bannertext (optional)
              </label>
              <Input
                type="text"
                placeholder="z.B. Nur diese Woche: Happy Hour bis 19 Uhr"
                value={offerBanner.text || ""}
                onChange={(e) =>
                  actions.payments.updatePaymentsAndOffers({
                    offerBanner: { ...offerBanner, text: e.target.value },
                  })
                }
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hintergrundfarbe
            </label>
            <Input
              type="color"
              value={offerBanner.backgroundColor || "#000000"}
              onChange={(e) =>
                actions.payments.updatePaymentsAndOffers({
                  offerBanner: {
                    ...offerBanner,
                    backgroundColor: e.target.value,
                  },
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Textfarbe
            </label>
            <Input
              type="color"
              value={offerBanner.textColor || "#FFFFFF"}
              onChange={(e) =>
                actions.payments.updatePaymentsAndOffers({
                  offerBanner: {
                    ...offerBanner,
                    textColor: e.target.value,
                  },
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Knopffarbe
            </label>
            <Input
              type="color"
              value={offerBanner.buttonColor || "#FFFFFF"}
              onChange={(e) =>
                actions.payments.updatePaymentsAndOffers({
                  offerBanner: {
                    ...offerBanner,
                    buttonColor: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Angebote-Seite anzeigen
            </label>
            <div className="flex items-center gap-2">
              <Switch
                id="offers-tab"
                checked={!!(storeState.payments as any).offerPageEnabled}
                onCheckedChange={(v) => {
                  if (!isMountedRef.current) return;
                  actions.payments.updatePaymentsAndOffers({
                    offerPageEnabled: v,
                  });
                }}
              />
              <label htmlFor="offers-tab" className="text-sm text-gray-600">
                Ergänzt einen Angebote-Tab in deiner Navigation
              </label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-6">Deine Angebote</h3>
        <div className="space-y-4">
          {offers.map((offer: any, index: number) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                {offer.image && (
                  <img
                    src={offer.image as string}
                    alt={offer.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div>
                  <p className="font-semibold">{offer.name}</p>
                  <p className="text-sm text-gray-600">{offer.price} €</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => removeOffer(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button
          onClick={() => (onBack ? onBack() : undefined)}
          variant="outline"
          size="lg"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={() => (onContinue ? onContinue() : undefined)}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
