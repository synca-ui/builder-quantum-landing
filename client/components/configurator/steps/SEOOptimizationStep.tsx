import {
  ArrowLeft,
  ChevronRight,
  Search,
  Share2,
  Eye,
  Camera,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";

interface SEOOptimizationStepProps {
  nextStep: () => void;
  prevStep: () => void;
  getDisplayedDomain?: () => string;
}

export function SEOOptimizationStep({
  nextStep,
  prevStep,
  getDisplayedDomain,
}: SEOOptimizationStepProps) {
  const business = useConfiguratorStore((s) => s.business);
  const publishing = useConfiguratorStore((s) => s.publishing);
  const actions = useConfiguratorActions();

  const metaTitle = (publishing as any).metaTitle || "";
  const metaDescription = (publishing as any).metaDescription || "";
  const keywords = (publishing as any).keywords || "";
  const socialMediaImage = (publishing as any).socialMediaImage || null;
  const googleAnalyticsId = (publishing as any).googleAnalyticsId || "";
  const seoApiOptimization = (publishing as any).seoApiOptimization || false;
  const seoApiCost = (publishing as any).seoApiCost || 49;

  const displayDomain = getDisplayedDomain
    ? getDisplayedDomain()
    : `${business.domain?.selectedDomain || business.name.toLowerCase().replace(/\s+/g, "")}.maitr.de`;

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          SEO Optimization
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Improve your search engine visibility and help customers find your
          business online.
        </p>
      </div>

      <div className="space-y-8">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2 text-blue-600" />
            Basic SEO Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Meta Title
              </label>
              <Input
                type="text"
                placeholder={`${business.name} - ${business.slogan || "Best Local Business"}`}
                value={metaTitle}
                onChange={(e) =>
                  actions.publishing.updatePublishingInfo({
                    metaTitle: e.target.value,
                  } as any)
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                The title that appears in search results (50-60 characters
                recommended)
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Meta Description
              </label>
              <Textarea
                placeholder={`Discover ${business.name} ${business.location ? `in ${business.location}` : ""}. ${business.uniqueDescription || "Quality service and great experience await you."}`}
                value={metaDescription}
                onChange={(e) =>
                  actions.publishing.updatePublishingInfo({
                    metaDescription: e.target.value,
                  } as any)
                }
                className="w-full"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Description that appears in search results (150-160 characters
                recommended)
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Keywords
              </label>
              <Input
                type="text"
                placeholder={`${business.type}, ${business.location}, restaurant, food, dining`}
                value={keywords}
                onChange={(e) =>
                  actions.publishing.updatePublishingInfo({
                    keywords: e.target.value,
                  } as any)
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated keywords that describe your business
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Share2 className="w-5 h-5 mr-2 text-purple-600" />
            Social Media Sharing
          </h3>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Social Media Image
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {socialMediaImage ? (
                <div className="space-y-3">
                  <img
                    src={
                      typeof socialMediaImage === "string"
                        ? socialMediaImage
                        : URL.createObjectURL(socialMediaImage)
                    }
                    alt="Social media preview"
                    className="mx-auto h-32 object-cover rounded"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      actions.publishing.updatePublishingInfo({
                        socialMediaImage: null,
                      } as any)
                    }
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        document.getElementById("social-image-upload")?.click()
                      }
                    >
                      Upload Image
                    </Button>
                    <input
                      id="social-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          actions.publishing.updatePublishingInfo({
                            socialMediaImage: file,
                          } as any);
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Image that appears when your website is shared on social
                    media
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-green-600" />
            Analytics & Tracking
          </h3>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Google Analytics ID (Optional)
            </label>
            <Input
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={googleAnalyticsId}
              onChange={(e) =>
                actions.publishing.updatePublishingInfo({
                  googleAnalyticsId: e.target.value,
                } as any)
              }
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add your Google Analytics tracking ID to monitor website traffic
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Crown className="w-5 h-5 mr-2 text-orange-600" />
            Premium SEO Optimization
          </h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="seo-api"
                checked={seoApiOptimization}
                onChange={(e) =>
                  actions.publishing.updatePublishingInfo({
                    seoApiOptimization: e.target.checked,
                  } as any)
                }
                className="mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor="seo-api"
                  className="text-sm font-bold text-gray-900 cursor-pointer"
                >
                  Enable AI-Powered SEO Optimization
                </label>
                <p className="text-sm text-gray-700 mt-1">
                  Our AI will automatically optimize your content, generate
                  additional meta tags, create structured data, and monitor your
                  search rankings.
                </p>
                <div className="mt-3">
                  <span className="text-lg font-bold text-orange-600">
                    ${seoApiCost}/month
                  </span>
                  <span className="text-sm text-gray-600 ml-2">
                    (billed annually)
                  </span>
                </div>
              </div>
            </div>

            {seoApiOptimization && (
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-2">
                  Premium Features Include:
                </h4>
                <ul className="space-y-1 text-sm text-orange-800">
                  <li>✓ Automatic content optimization for search engines</li>
                  <li>
                    ✓ Schema markup generation for better search visibility
                  </li>
                  <li>✓ Local SEO optimization for location-based searches</li>
                  <li>✓ Weekly SEO performance reports</li>
                  <li>✓ Competitor analysis and recommendations</li>
                  <li>✓ Priority support and SEO consultation</li>
                </ul>
                <div className="mt-3 p-2 bg-orange-100 rounded">
                  <p className="text-xs text-orange-800">
                    <strong>Integration:</strong> We'll connect with leading SEO
                    APIs including SEMrush, Ahrefs, and Google Search Console
                    for comprehensive optimization.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Search Result Preview
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="space-y-1">
              <h4 className="text-blue-600 text-lg hover:underline cursor-pointer">
                {metaTitle ||
                  `${business.name} - ${business.slogan || "Best Local Business"}`}
              </h4>
              <p className="text-green-700 text-sm">{displayDomain}</p>
              <p className="text-gray-700 text-sm">
                {metaDescription ||
                  `Discover ${business.name} ${business.location ? `in ${business.location}` : ""}. ${business.uniqueDescription || "Quality service and great experience await you."}`}
              </p>
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
