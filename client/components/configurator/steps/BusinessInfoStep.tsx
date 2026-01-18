
/**
 * Business Information Step Component
 * Extracts business name, type, location, slogan, and description
 * Consumes Zustand store directly - zero prop drilling
 */

import { useCallback, useState } from "react";
import {
  Coffee,
  Utensils,
  ShoppingBag,
  MapPin,
  Plus,
  ArrowLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  useConfiguratorBusiness,
  useConfiguratorActions,
} from "@/store/configuratorStore";

// Business type options matching the original Configurator
const BUSINESS_TYPES = [
  {
    value: "cafe",
    label: "Café",
    icon: <Coffee className="w-6 h-6" />,
    gradient: "from-amber-400 to-orange-500",
  },
  {
    value: "restaurant",
    label: "Restaurant",
    icon: <Utensils className="w-6 h-6" />,
    gradient: "from-red-400 to-rose-500",
  },
  {
    value: "bar",
    label: "Bar",
    icon: <ShoppingBag className="w-6 h-6" />,
    gradient: "from-purple-500 to-indigo-600",
  },
];

interface StepProps {
  nextStep: () => void;
  prevStep: () => void;
}

export function BusinessInfoStep({ nextStep, prevStep }: StepProps) {
  // Get state from store
  const business = useConfiguratorBusiness();

  // Get actions from store
  // FIX: Wir holen hier NUR 'business', 'navigation' brauchen wir nicht mehr,
  // da wir die Props nutzen.
  const { business: businessActions } = useConfiguratorActions();

  // Local UI state for optional fields visibility
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Validation
  const isValid = !!(business.name && business.type);

  // Handlers
  const handleBusinessNameChange = useCallback(
    (value: string) => {
      businessActions.updateBusinessName(value);
    },
    [businessActions],
  );

  const handleBusinessTypeChange = useCallback(
    (type: string) => {
      businessActions.updateBusinessType(type);
    },
    [businessActions],
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      businessActions.updateLocation(value);
    },
    [businessActions],
  );

  const handleSloganChange = useCallback(
    (value: string) => {
      businessActions.updateSlogan(value);
    },
    [businessActions],
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      // Nutze hier die passende Action aus deinem Store (entweder setBusinessInfo oder updateUniqueDescription)
      // Ich habe es so gelassen wie in deinem Snippet:
      if (businessActions.setBusinessInfo) {
        businessActions.setBusinessInfo({ uniqueDescription: value });
      } else if ((businessActions as any).updateUniqueDescription) {
        (businessActions as any).updateUniqueDescription(value);
      }
    },
    [businessActions],
  );

  // FIX: Nutze jetzt die Prop 'prevStep' statt navigationActions
  const handlePrevStep = useCallback(() => {
    prevStep();
  }, [prevStep]);

  // FIX: Nutze jetzt die Prop 'nextStep' statt navigationActions
  const handleNextStep = useCallback(() => {
    if (isValid) {
      nextStep();
    }
  }, [isValid, nextStep]);

  return (
    <div className="py-8 max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Tell us about your business
        </h2>
        <p className="text-gray-600">Just the basics to get started</p>
      </div>

      <div className="space-y-4">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Business Name *
          </label>
          <Input
            type="text"
            placeholder="e.g. Bella's Café"
            value={business.name}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            className="w-full px-4 py-3 text-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            autoComplete="organization"
          />
        </div>

        {/* Business Type - Compact */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Business Type *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((type) => (
              <Card
                key={type.value}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  business.type === type.value
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300"
                }`}
                onClick={() => handleBusinessTypeChange(type.value)}
              >
                <CardContent className="p-3 text-center">
                  <div
                    className={`w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-r ${type.gradient} flex items-center justify-center text-white`}
                  >
                    {type.icon}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {type.label}
                  </h3>
                  {business.type === type.value && (
                    <Check className="w-4 h-4 text-teal-600 mx-auto mt-1" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="City, State"
              value={business.location || ""}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full pl-10 px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              autoComplete="address-level2"
            />
          </div>
        </div>

        {/* Optional Fields Toggle */}
        {!showOptionalFields && (
          <div className="text-center pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowOptionalFields(true)}
              className="text-teal-600 hover:text-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add tagline and description (optional)
            </Button>
          </div>
        )}

        {/* Optional Fields */}
        {showOptionalFields && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Tagline
              </label>
              <Input
                type="text"
                placeholder="e.g. The best coffee in town"
                value={business.slogan || ""}
                onChange={(e) => handleSloganChange(e.target.value)}
                className="w-full px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                What makes you special?
              </label>
              <Textarea
                placeholder="Tell us what sets you apart..."
                value={business.uniqueDescription || ""}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="w-full px-4 py-3 h-20 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
              />
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowOptionalFields(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Hide optional fields
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button
          type="button"
          onClick={handlePrevStep}
          variant="outline"
          size="lg"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={!isValid}
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