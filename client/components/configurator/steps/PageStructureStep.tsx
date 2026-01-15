import { useConfiguratorStore, useConfiguratorActions } from "@/store/configuratorStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowLeft, ChevronRight } from "lucide-react";
import { pageOptions } from "@/lib/configurator-data";

interface PageStructureStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

export default function PageStructureStep({
  nextStep,
  prevStep,
}: PageStructureStepProps) {
  // Read from Zustand store
  const selectedPages = useConfiguratorStore((s) => s.pages.selectedPages);
  const businessType = useConfiguratorStore((s) => s.business.type);
  const showHomeHero = useConfiguratorStore((s) => s.content.showHomeHero);

  // Get actions
  const actions = useConfiguratorActions();

  const togglePage = (pageId: string, required: boolean) => {
    if (required) return;

    const newPages = selectedPages.includes(pageId)
      ? selectedPages.filter((p) => p !== pageId)
      : [...selectedPages, pageId];

    actions.pages.updatePageManagement({ selectedPages: newPages });
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Select your pages
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose which pages your website will include. You can always add more
          later.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageOptions.map((page) => {
          const isSelected = selectedPages.includes(page.id);
          const isVisible =
            !page.condition || page.condition.includes(businessType);

          if (!isVisible) return null;

          return (
            <Card
              key={page.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${
                isSelected
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              } ${page.required ? "opacity-75" : ""}`}
              onClick={() => togglePage(page.id, page.required)}
            >
              <CardContent className="p-6 text-center">
                <div
                  className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${
                    isSelected
                      ? "from-teal-500 to-purple-500"
                      : "from-gray-400 to-gray-500"
                  } flex items-center justify-center text-white`}
                >
                  {page.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {page.name}
                </h3>
                {page.required && (
                  <p className="text-xs text-gray-500">Required</p>
                )}
                {isSelected && !page.required && (
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

      {/* Page-Specific Configuration Info */}
      <Card className="p-6 mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Homepage Options
        </h3>
        <label className="inline-flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={!!showHomeHero}
            onChange={(e) =>
              actions.content.updateContent({ showHomeHero: e.target.checked })
            }
          />
          <span>Show header block under headline (logo + name)</span>
        </label>
      </Card>

      {selectedPages.length > 1 && (
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Selected Pages Configuration
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            You've selected multiple pages. During the next steps, you'll be
            able to configure specific content for each page:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {selectedPages.map((pageId) => {
              const pageInfo = {
                home: {
                  name: "Home",
                  config: "Business info, hero section, featured content",
                },
                menu: {
                  name: "Menu",
                  config: "Menu items, categories, pricing",
                },
                gallery: {
                  name: "Gallery",
                  config: "Photo uploads, image organization",
                },
                about: {
                  name: "About",
                  config: "Business story, team members, mission",
                },
                reservations: {
                  name: "Reservations",
                  config: "Booking system, time slots, policies",
                },
                contact: {
                  name: "Contact",
                  config: "Contact details, location, hours",
                },
              };

              const page = pageInfo[pageId];
              if (!page) return null;

              return (
                <div
                  key={pageId}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">
                    {page.name}
                  </h4>
                  <p className="text-xs text-gray-600">{page.config}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex justify-between mt-8">
        <Button type="button" onClick={prevStep} variant="outline" size="lg">
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
