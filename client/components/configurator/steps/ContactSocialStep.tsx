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

export function ContactSocialStep({
  nextStep,
  prevStep,
}: ContactSocialStepProps) {
  const contact = useConfiguratorStore((s) => s.contact);
  const actions = useConfiguratorActions();

  const contactMethods = [
    {
      id: "phone",
      icon: <Phone className="w-5 h-5" />,
      label: "Phone",
      placeholder: "+1 (555) 123-4567",
    },
    {
      id: "email",
      icon: <Mail className="w-5 h-5" />,
      label: "Email",
      placeholder: "hello@yourbusiness.com",
    },
    {
      id: "address",
      icon: <MapPin className="w-5 h-5" />,
      label: "Address",
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

      if (existingIndex >= 0) {
        updatedMethods[existingIndex] = { type: methodId, value };
      } else {
        updatedMethods.push({ type: methodId, value });
      }

      actions.contact.updateContactInfo({ contactMethods: updatedMethods });
    }
  };

  const instagramSync = (contact as any).instagramSync || false;
  const toggleInstagramSync = () => {
    actions.contact.updateContactInfo({ instagramSync: !instagramSync } as any);
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Contact & social media
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          How can customers reach you? Add your contact information and social
          media links.
        </p>
      </div>

      <div className="space-y-8">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Contact Information
          </h3>
          <div className="space-y-4">
            {contactMethods.map((method) => (
              <div key={method.id}>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {method.label}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
                    {method.icon}
                  </div>
                  <Input
                    type="text"
                    placeholder={method.placeholder}
                    value={getContactValue(method.id)}
                    onChange={(e) =>
                      updateContactValue(method.id, e.target.value)
                    }
                    className="pl-12"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Social Media</h3>
          <div className="space-y-4">
            {socialPlatforms.map((platform) => (
              <div key={platform.id}>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {platform.label}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
                    {platform.icon}
                  </div>
                  <Input
                    type="text"
                    placeholder={platform.placeholder}
                    value={getSocialValue(platform.id)}
                    onChange={(e) =>
                      actions.contact.updateSocialMedia(
                        platform.id,
                        e.target.value,
                      )
                    }
                    className="pl-12"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-md font-bold text-gray-900">
                  Instagram Integration
                </h4>
                <p className="text-sm text-gray-600">
                  Automatically sync your Instagram posts to your website
                </p>
              </div>
              <Button
                variant={instagramSync ? "default" : "outline"}
                onClick={toggleInstagramSync}
                className={instagramSync ? "bg-teal-500 hover:bg-teal-600" : ""}
              >
                {instagramSync ? "Enabled" : "Disabled"}
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
