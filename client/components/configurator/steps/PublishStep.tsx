import { useState } from "react";
import { ArrowLeft, Cloud, Rocket, Check, Eye, Home } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { publishWebApp } from "@/lib/webapps";
import type { Configuration } from "@/types/domain";

interface PublishStepProps {
  prevStep: () => void;
  getLiveUrl?: () => string;
  getDisplayedDomain?: () => string;
  saveToBackend?: (data: Partial<Configuration>) => Promise<void>;
}

export function PublishStep({
  prevStep,
  getLiveUrl,
  getDisplayedDomain,
  saveToBackend,
}: PublishStepProps) {
  const { getToken } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");

  const fullState = useConfiguratorStore((s) => s);
  const actions = useConfiguratorActions();

  const business = fullState.business;
  const design = fullState.design;
  const pages = fullState.pages;
  const contact = fullState.contact;

  const liveUrl = getLiveUrl
    ? getLiveUrl()
    : `https://${business.domain?.selectedDomain || business.name.toLowerCase().replace(/\s+/g, "")}.maitr.de`;

  const displayDomain = getDisplayedDomain
    ? getDisplayedDomain()
    : `${business.domain?.selectedDomain || business.name.toLowerCase().replace(/\s+/g, "")}.maitr.de`;

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const configData = actions.data.getFullConfiguration();

      if (saveToBackend) {
        await saveToBackend(configData);
      }

      const token = await getToken();
      const subdomain =
        business.domain?.selectedDomain ||
        business.name.toLowerCase().replace(/\s+/g, "");

      const result = await publishWebApp(
        subdomain,
        configData,
        token || undefined,
      );

      actions.publishing.publishConfiguration();
      actions.publishing.updatePublishingInfo({
        publishedUrl: result.publishedUrl || liveUrl,
        previewUrl: result.previewUrl,
      });

      setPublishedUrl(result.publishedUrl || liveUrl);
      setIsPublished(true);
    } catch (error) {
      console.error("Publishing failed:", error);
      alert("Failed to publish website. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Publish your website
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Everything looks perfect! Ready to make your website live and start
          attracting customers?
        </p>
      </div>

      {!isPublished ? (
        <div className="space-y-8">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Pre-Launch Checklist
            </h3>
            <div className="space-y-4">
              {[
                {
                  item: "Business information completed",
                  checked: !!business.name,
                },
                {
                  item: "Template and design customized",
                  checked: !!design.template,
                },
                {
                  item: "Pages and content configured",
                  checked: pages.selectedPages.length > 0,
                },
                {
                  item: "Contact information added",
                  checked: !!contact.email || contact.contactMethods.length > 0,
                },
                {
                  item: "Domain or subdomain selected",
                  checked:
                    !!business.domain?.selectedDomain ||
                    !!business.domain?.domainName,
                },
              ].map((check, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      check.checked ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    {check.checked && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span
                    className={`${check.checked ? "text-gray-900" : "text-gray-500"}`}
                  >
                    {check.item}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Your Website Summary
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Business Details
                </h4>
                <p className="text-gray-600 text-sm mb-1">
                  Name: {business.name}
                </p>
                <p className="text-gray-600 text-sm mb-1">
                  Type: {business.type}
                </p>
                <p className="text-gray-600 text-sm">
                  Location: {business.location}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Website Features
                </h4>
                <p className="text-gray-600 text-sm mb-1">
                  Template: {design.template}
                </p>
                <p className="text-gray-600 text-sm mb-1">
                  Pages: {pages.selectedPages.length}
                </p>
                <div className="space-y-1">
                  <p className="text-gray-600 text-sm">
                    Domain: {displayDomain}
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      Your Live URL:
                    </p>
                    <p className="font-mono text-sm text-green-700 break-all">
                      {liveUrl}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="text-center">
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              size="lg"
              className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-16 py-8 text-2xl font-bold rounded-full shadow-2xl hover:scale-105 transition-all duration-300"
            >
              {isPublishing ? (
                <>
                  <Cloud className="mr-4 w-8 h-8 animate-pulse" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="mr-4 w-8 h-8" />
                  Publish Website
                </>
              )}
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Your website will be live in seconds!
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-16 h-16 text-green-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              🎉 Congratulations!
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Your website is now live and ready for customers!
            </p>
            <div className="space-y-4">
              <Button
                onClick={() => window.open(publishedUrl || liveUrl, "_blank")}
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white mr-4"
              >
                <Eye className="mr-2 w-5 h-5" />
                View Live Website
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                size="lg"
              >
                <Home className="mr-2 w-5 h-5" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isPublished && (
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
          <div></div>
        </div>
      )}
    </div>
  );
}
