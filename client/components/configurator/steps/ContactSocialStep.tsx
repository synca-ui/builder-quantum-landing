import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react"; // ✅ useState, useEffect für Debounce
import { useDebounce } from "@/hooks/useDebounce"; // ✅ Debounce Hook
import {
  ArrowLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";

interface ContactSocialStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

// ✅ Debounced Input Helper Component
const DebouncedContactInput = ({
  icon,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 400);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, value, onChange]);

  return (
    <div className="relative">
      <div className="absolute left-3 top-3 text-gray-400">{icon}</div>
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-12"
      />
    </div>
  );
};

export function ContactSocialStep({
  nextStep,
  prevStep,
}: ContactSocialStepProps) {
  const { t } = useTranslation();
  const contact = useConfiguratorStore((s) => s.contact);
  const actions = useConfiguratorActions();

  const contactMethods = [
    {
      id: "phone",
      icon: <Phone className="w-5 h-5" />,
      labelKey: "contact.phone",
      placeholder: "+1 (555) 123-4567",
    },
    {
      id: "email",
      icon: <Mail className="w-5 h-5" />,
      labelKey: "contact.email",
      placeholder: "hello@yourbusiness.com",
    },
    {
      id: "address",
      icon: <MapPin className="w-5 h-5" />,
      labelKey: "contact.address",
      placeholder: "123 Main St, City, State",
    },
  ];

  const socialPlatforms = [
    {
      id: "instagram",
      icon: <Instagram className="w-5 h-5" />,
      label: "Instagram",
      placeholder: "@yourbusiness",
    },
    {
      id: "facebook",
      icon: <Facebook className="w-5 h-5" />,
      label: "Facebook",
      placeholder: "facebook.com/yourbusiness",
    },
  ];

  const getContactValue = (methodId: string) => {
    if (methodId === "phone") return contact.phone || "";
    if (methodId === "email") return contact.email || "";

    if (!contact.contactMethods) return "";
    if (Array.isArray(contact.contactMethods)) {
      const contactItem = contact.contactMethods.find(
        (c) => c.type === methodId,
      );
      return contactItem ? contactItem.value : "";
    }
    return (contact.contactMethods as any)[methodId] || "";
  };

  const getSocialValue = (platformId: string) => {
    if (!contact.socialMedia) return "";
    return contact.socialMedia[platformId] || "";
  };

  const updateContactValue = (methodId: string, value: string) => {
    if (methodId === "phone") {
      actions.contact.updateContactInfo({ phone: value });
    } else if (methodId === "email") {
      actions.contact.updateContactInfo({ email: value });
    } else {
      const currentMethods = Array.isArray(contact.contactMethods)
        ? contact.contactMethods
        : [];

      const existingIndex = currentMethods.findIndex(
        (c) => c.type === methodId,
      );
      const updatedMethods = [...currentMethods];

      type ValidMethodType = "phone" | "email";

      if (existingIndex >= 0) {
        updatedMethods[existingIndex] = {
          type: methodId as ValidMethodType, // 👈 Cast it here
          value
        };
      } else {
        updatedMethods.push({
          type: methodId as ValidMethodType, // 👈 And here
          value
        });
      }

      const instagramSync = (contact as any).instagramSync || false;
      const toggleInstagramSync = () => {
        actions.contact.updateContactInfo({ instagramSync: !instagramSync } as any);
      };

      return (
        <div className="py-8 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("steps.contactSocial.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("steps.contactSocial.subtitle")}
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                {t("contact.information")}
              </h3>
              <div className="space-y-4">
                {contactMethods.map((method) => (
                  <div key={method.id}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t(method.labelKey)}
                    </label>
                    {/* ✅ Debounced Input statt direkter Input */}
                    <DebouncedContactInput
                      icon={method.icon}
                      placeholder={method.placeholder}
                      value={getContactValue(method.id)}
                      onChange={(value) => updateContactValue(method.id, value)}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                {t("contact.socialMedia")}
              </h3>
              <div className="space-y-4">
                {socialPlatforms.map((platform) => (
                  <div key={platform.id}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {platform.label}
                    </label>
                    {/* ✅ Debounced Input statt direkter Input */}
                    <DebouncedContactInput
                      icon={platform.icon}
                      placeholder={platform.placeholder}
                      value={getSocialValue(platform.id)}
                      onChange={(value) => actions.contact.updateSocialMedia(platform.id, value)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-md font-bold text-gray-900">
                      {t("contact.instagramIntegration")}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {t("contact.instagramIntegrationDesc")}
                    </p>
                  </div>
                  <Button
                    variant={instagramSync ? "default" : "outline"}
                    onClick={toggleInstagramSync}
                    className={instagramSync ? "bg-teal-500 hover:bg-teal-600" : ""}
                  >
                    {instagramSync ? t("features.enable") : t("features.disable")}
                  </Button>
                </div>
              </div>
            </Card>
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
  };
}