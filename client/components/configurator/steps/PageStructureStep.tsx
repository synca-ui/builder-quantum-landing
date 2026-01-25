import { useTranslation } from "react-i18next";
import {
  Check,
  Home,
  Coffee,
  Camera,
  Heart,
  Calendar,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";

const PAGE_OPTIONS = [
  {
    id: "home",
    name: "Home",
    required: true,
    description: "Main landing page",
    icon: <Home className="w-5 h-5" />,
  },
  {
    id: "menu",
    name: "Menu",
    description: "Your products or dishes",
    icon: <Coffee className="w-5 h-5" />,
  },
  {
    id: "gallery",
    name: "Gallery",
    description: "Photos of your business",
    icon: <Camera className="w-5 h-5" />,
  },
  {
    id: "about",
    name: "About",
    description: "Your story and team",
    icon: <Heart className="w-5 h-5" />,
  },
  {
    id: "reservations",
    name: "Reservations",
    description: "Table booking system",
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: "contact",
    name: "Contact",
    description: "Location and info",
    icon: <Phone className="w-5 h-5" />,
  },
];

interface StepProps {
  nextStep: () => void;
  prevStep: () => void;
}

export function PageStructureStep({ nextStep, prevStep }: StepProps) {
  const { t } = useTranslation();
  const selectedPages = useConfiguratorStore((s) => s.pages.selectedPages);
  const { pages: pageActions } = useConfiguratorActions();

  const togglePage = (pageId: string, required: boolean) => {
    if (required) return;

    const current = selectedPages || [];
    let updated: string[];

    if (current.includes(pageId)) {
      updated = current.filter((id) => id !== pageId);
    } else {
      updated = [...current, pageId];
    }

    pageActions.updatePageManagement({ selectedPages: updated });
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {t("steps.pageStructure.title")}
        </h2>
        <p className="text-gray-600">{t("steps.pageStructure.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {PAGE_OPTIONS.map((page) => {
          const isSelected = selectedPages.includes(page.id);
          return (
            <Card
              key={page.id}
              onClick={() => togglePage(page.id, !!page.required)}
              className={`cursor-pointer transition-all duration-200 border-2 relative overflow-hidden group ${
                isSelected
                  ? "border-teal-500 bg-teal-50/50"
                  : "border-gray-200 hover:border-teal-200 hover:shadow-sm"
              } ${page.required ? "opacity-80 cursor-not-allowed" : ""}`}
            >
              <CardContent className="p-5 flex flex-col items-center text-center h-full">
                <div
                  className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-teal-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-500 group-hover:bg-teal-100 group-hover:text-teal-600"
                  }`}
                >
                  {page.icon}
                </div>

                <h3
                  className={`font-bold text-lg mb-1 ${isSelected ? "text-teal-900" : "text-gray-900"}`}
                >
                  {t(`pages.${page.id}.name`)}
                </h3>
                <p className="text-xs text-gray-500">
                  {t(`pages.${page.id}.description`)}
                </p>

                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}

                {page.required && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {t("common.required")}
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
        <Button onClick={prevStep} variant="outline" size="lg">
          {t("common.back")}
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500 text-white"
        >
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
