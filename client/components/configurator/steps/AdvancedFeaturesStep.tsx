import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ShoppingBag,
  Store,
  Users,
  Star,
  Crown,
  Zap,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";

interface AdvancedFeaturesStepProps {
  nextStep: () => void;
  prevStep: () => void;
  setPendingFeatureConfig?: (feature: string | null) => void;
  setCurrentStep?: (step: number) => void;
  configuratorSteps?: any[];
}

export function AdvancedFeaturesStep({
  nextStep,
  prevStep,
  setPendingFeatureConfig,
  setCurrentStep,
  configuratorSteps,
}: AdvancedFeaturesStepProps) {
  const features = useConfiguratorStore((s) => s.features);
  const actions = useConfiguratorActions();

  const featureList = [
    {
      id: "onlineOrderingEnabled",
      title: "Online Ordering",
      description: "Allow customers to place orders directly from your website",
      icon: <ShoppingBag className="w-8 h-8" />,
      premium: false,
    },
    {
      id: "onlineStoreEnabled",
      title: "Online Store",
      description:
        "Sell products and merchandise online with payment processing",
      icon: <Store className="w-8 h-8" />,
      premium: true,
    },
    {
      id: "teamAreaEnabled",
      title: "Team Section",
      description: "Showcase your team members and their roles",
      icon: <Users className="w-8 h-8" />,
      premium: false,
    },
    {
      id: "loyaltyEnabled",
      title: "Stamp Card / Loyalty",
      description: "Reward returning customers with digital stamps",
      icon: <Star className="w-8 h-8" />,
      premium: false,
    },
    {
      id: "couponsEnabled",
      title: "Coupons / Vouchers",
      description: "Create and manage digital coupon campaigns",
      icon: <Crown className="w-8 h-8" />,
      premium: false,
    },
    {
      id: "offersEnabled",
      title: "Current Offers / Specials",
      description: "Highlight time-limited deals and bundles",
      icon: <Zap className="w-8 h-8" />,
      premium: false,
    },
  ];

  const handleFeatureClick = (featureId: string, enabled: boolean) => {
    const willEnable = !enabled;

    actions.features.updateFeatureFlags({ [featureId]: willEnable } as any);

    if (
      willEnable &&
      setPendingFeatureConfig &&
      setCurrentStep &&
      configuratorSteps
    ) {
      setPendingFeatureConfig(featureId);
      const idx = configuratorSteps.findIndex((s) => s.id === "feature-config");
      if (idx !== -1) setCurrentStep(idx);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Optional features
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Enable advanced functionality to enhance your website and provide
          better customer experience.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featureList.map((feature) => {
          const isEnabled = (features as any)[feature.id];
          return (
            <Card
              key={feature.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${
                isEnabled
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              }`}
              onClick={() => handleFeatureClick(feature.id, isEnabled)}
            >
              <CardContent className="p-6 text-center">
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                    isEnabled
                      ? "bg-teal-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                {feature.premium && (
                  <div className="mb-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold rounded-full">
                      Premium
                    </span>
                  </div>
                )}
                <p className="text-gray-600 text-sm mb-4">
                  {feature.description}
                </p>
                {isEnabled && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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
          Back
        </Button>
        <Button
          onClick={nextStep}
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
