import React, { useState } from "react";
import { InfoIcon } from "lucide-react";

export interface AdvancedFeatures {
  onlineOrdering: boolean;
  onlineStore: boolean;
  teamArea: boolean;
  loyaltyProgram: boolean;
  guestCheckout: boolean;
  analyticsTracking: boolean;
  customDomain: boolean;
  apiAccess: boolean;
}

interface AdvancedFeaturesCardProps {
  features?: Partial<AdvancedFeatures>;
  onChange?: (features: Partial<AdvancedFeatures>) => void;
}

const FEATURE_LIST = [
  {
    id: "onlineOrdering",
    label: "Online Ordering",
    description:
      "Allow customers to place orders online with payment processing",
    icon: "🛒",
  },
  {
    id: "onlineStore",
    label: "Online Store",
    description: "Sell products directly with inventory management",
    icon: "🏪",
  },
  {
    id: "teamArea",
    label: "Team Area",
    description: "Invite team members to manage content and orders",
    icon: "👥",
  },
  {
    id: "loyaltyProgram",
    label: "Loyalty Program",
    description: "Create points-based loyalty rewards for customers",
    icon: "⭐",
  },
  {
    id: "guestCheckout",
    label: "Guest Checkout",
    description: "Allow customers to checkout without creating an account",
    icon: "🚀",
  },
  {
    id: "analyticsTracking",
    label: "Analytics & Tracking",
    description: "Track visitor behavior and order analytics",
    icon: "📊",
  },
  {
    id: "customDomain",
    label: "Custom Domain",
    description: "Use your own domain (e.g., myrestaurant.com)",
    icon: "🌐",
  },
  {
    id: "apiAccess",
    label: "API Access",
    description: "Access data via API for custom integrations",
    icon: "⚙️",
  },
];

export function AdvancedFeaturesCard({
  features = {},
  onChange,
}: AdvancedFeaturesCardProps) {
  const [enabledFeatures, setEnabledFeatures] = useState<
    Partial<AdvancedFeatures>
  >(features || {});

  const handleToggle = (featureId: string) => {
    const updated = {
      ...enabledFeatures,
      [featureId]: !enabledFeatures[featureId as keyof AdvancedFeatures],
    };
    setEnabledFeatures(updated);
    onChange?.(updated);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
        <InfoIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Enable features to unlock advanced capabilities for your site. Some
          features may require a higher subscription tier.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FEATURE_LIST.map((feature) => (
          <label
            key={feature.id}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
          >
            <input
              type="checkbox"
              checked={
                enabledFeatures[feature.id as keyof AdvancedFeatures] || false
              }
              onChange={() => handleToggle(feature.id)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{feature.icon}</span>
                <p className="font-medium text-gray-900 text-sm">
                  {feature.label}
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {feature.description}
              </p>
            </div>
          </label>
        ))}
      </div>

      {Object.values(enabledFeatures).some((v) => v) && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            ✓ {Object.values(enabledFeatures).filter((v) => v).length} feature
            {Object.values(enabledFeatures).filter((v) => v).length !== 1
              ? "s"
              : ""}{" "}
            enabled
          </p>
        </div>
      )}
    </div>
  );
}

export default AdvancedFeaturesCard;
