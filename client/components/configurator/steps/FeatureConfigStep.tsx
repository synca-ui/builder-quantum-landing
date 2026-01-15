import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useConfiguratorStore, useConfiguratorActions } from "@/store/configuratorStore";

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
  const storeState = useConfiguratorStore((s) => s);
  const actions = useConfiguratorActions();

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;

    if (!pendingFeatureConfig) {
      nextStep();
    }
  }, [pendingFeatureConfig, nextStep]);

  const finish = () => {
    setPendingFeatureConfig(null);
    nextStep();
  };

  const goBack = () => {
    setPendingFeatureConfig(null);
    if (setCurrentStep && configuratorSteps) {
      const idx = configuratorSteps.findIndex((s) => s.id === "advanced-features");
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
            <h4 className="text-lg font-bold mb-3">Online Ordering Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  POS Provider
                </label>
                <select
                  value={(storeState.features as any).posProvider || "none"}
                  onChange={(e) => updateFeatureData("posProvider", e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="none">None</option>
                  <option value="sumup">SumUp</option>
                  <option value="shopify">Shopify POS</option>
                  <option value="local">Local POS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Options
                </label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(["applePay", "googlePay", "card", "cash"] as const).map((k) => (
                    <label key={k} className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!((storeState.features as any).paymentMethods?.[k])}
                        onChange={(e) =>
                          updateFeatureData("paymentMethods", {
                            ...((storeState.features as any).paymentMethods || {}),
                            [k]: e.target.checked,
                          })
                        }
                      />
                      <span className="capitalize">
                        {k.replace(/([A-Z])/g, " $1")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Order Options
                </label>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {(["delivery", "pickup", "table"] as const).map((k) => (
                    <label key={k} className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!((storeState.features as any).orderOptions?.[k])}
                        onChange={(e) =>
                          updateFeatureData("orderOptions", {
                            ...((storeState.features as any).orderOptions || {}),
                            [k]: e.target.checked,
                          })
                        }
                      />
                      <span className="capitalize">{k}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!((storeState.features as any).deliveryAddressRequired)}
                    onChange={(e) =>
                      updateFeatureData("deliveryAddressRequired", e.target.checked)
                    }
                  />
                  <span>Require delivery address for delivery orders</span>
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
                <label className="block text-sm font-medium mb-1">Categories</label>
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
                  {(storeState.content.categories || []).map((c: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">Options</label>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!((storeState.features as any).showStockLevels)}
                    onChange={(e) =>
                      updateFeatureData("showStockLevels", e.target.checked)
                    }
                  />
                  <span>Show stock levels</span>
                </label>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!((storeState.features as any).discountsEnabled)}
                    onChange={(e) =>
                      updateFeatureData("discountsEnabled", e.target.checked)
                    }
                  />
                  <span>Enable discounts</span>
                </label>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!((storeState.features as any).bundlesEnabled)}
                    onChange={(e) =>
                      updateFeatureData("bundlesEnabled", e.target.checked)
                    }
                  />
                  <span>Enable bundles</span>
                </label>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!((storeState.features as any).seasonalOffersEnabled)}
                    onChange={(e) =>
                      updateFeatureData("seasonalOffersEnabled", e.target.checked)
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
            <h4 className="text-lg font-bold mb-3">Team Section Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Alex"
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
                <p className="text-xs text-gray-400 mt-1">Press Enter to add</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quick Roles</label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["chef", "barista", "waiter"].map((r) => (
                    <button
                      key={r}
                      className="px-2 py-1 border rounded"
                      onClick={() =>
                        updateFeatureData("teamMembers", [
                          ...((storeState.features as any).teamMembers || []),
                          {
                            name: r.charAt(0).toUpperCase() + r.slice(1),
                            role: r,
                            status: "off_duty",
                          },
                        ])
                      }
                    >
                      + {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
                  value={((storeState.features as any).loyaltyConfig?.stampsForReward) || 10}
                  onChange={(e) =>
                    updateFeatureData("loyaltyConfig", {
                      ...((storeState.features as any).loyaltyConfig || {}),
                      stampsForReward: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reward type</label>
                <select
                  value={((storeState.features as any).loyaltyConfig?.rewardType) || "discount"}
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
                  value={((storeState.features as any).loyaltyConfig?.expiryDate) || ""}
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
                      document.getElementById("coupon-type-step") as HTMLSelectElement
                    ).value;
                    const value = (
                      document.getElementById("coupon-value-step") as HTMLInputElement
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
                {((storeState.features as any).coupons || []).map((c: any, i: number) => (
                  <div key={i} className="p-3 border rounded">
                    <div className="text-sm font-semibold">
                      {c.type} - {c.value}
                    </div>
                    <div className="text-xs text-gray-600">{c.conditions}</div>
                  </div>
                ))}
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
          Feature configuration
        </h2>
      </div>
      {render()}
      <div className="flex justify-between mt-8">
        <Button onClick={goBack} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={finish}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Save & Continue
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

function OffersStep({ onBack, onContinue, storeState, actions }: OffersStepProps) {
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
    const reader = new FileReader();
    reader.onload = (e) => {
      setNewOffer((prev) => ({ ...prev, image: e.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const offers = (storeState.payments as any).offers || [];
  const offerBanner = (storeState.payments as any).offerBanner || {};

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Create Your Offers
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Add special offers and promotions to attract customers.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-lg border mb-8">
        <h3 className="text-xl font-bold mb-6">Add New Offer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            placeholder="Offer Name (e.g., Lunch Special)"
            value={newOffer.name}
            onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })}
          />
          <Input
            placeholder="Price (e.g., 9.99)"
            value={newOffer.price}
            onChange={(e) => setNewOffer({ ...newOffer, price: e.target.value })}
          />
          <Textarea
            placeholder="Description"
            value={newOffer.description}
            onChange={(e) =>
              setNewOffer({ ...newOffer, description: e.target.value })
            }
            className="md:col-span-2"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offer Image
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
          <Button onClick={addOffer}>Add Offer</Button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-lg border mt-8">
        <h3 className="text-xl font-bold mb-6">Customize Offer Banner</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
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
              Text Color
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
              Button Color
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
              Show Offers Page/Tab
            </label>
            <div className="flex items-center gap-2">
              <Switch
                id="offers-tab"
                checked={!!((storeState.payments as any).offerPageEnabled)}
                onCheckedChange={(v) => {
                  if (!isMountedRef.current) return;
                  actions.payments.updatePaymentsAndOffers({ offerPageEnabled: v });
                }}
              />
              <label htmlFor="offers-tab" className="text-sm text-gray-600">
                Adds an Offers tab to your menu
              </label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-6">Your Offers</h3>
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
                  <p className="text-sm text-gray-600">${offer.price}</p>
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
