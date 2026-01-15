import { useState } from "react";
import { ArrowLeft, ChevronRight, Zap, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useConfiguratorStore, useConfiguratorActions } from "@/store/configuratorStore";

interface DomainHostingStepProps {
  nextStep: () => void;
  prevStep: () => void;
  getBaseHost?: () => string;
  getDisplayedDomain?: () => string;
}

export function DomainHostingStep({
  nextStep,
  prevStep,
  getBaseHost,
  getDisplayedDomain,
}: DomainHostingStepProps) {
  const business = useConfiguratorStore((s) => s.business);
  const actions = useConfiguratorActions();

  const [domainSearch, setDomainSearch] = useState("");
  const [availableDomains] = useState([
    { domain: "yourbusiness.com", available: true, price: "$12.99/year" },
    { domain: "yourbusiness.net", available: true, price: "$13.99/year" },
    { domain: "yourbusiness.org", available: false, price: "Taken" },
  ]);

  const hasDomain = business.domain?.hasDomain || false;
  const domainName = business.domain?.domainName || "";
  const selectedDomain = business.domain?.selectedDomain || "";
  const baseHost = getBaseHost ? getBaseHost() : "maitr.de";
  const displayDomain = getDisplayedDomain
    ? getDisplayedDomain()
    : `${selectedDomain || business.name.toLowerCase().replace(/\s+/g, "")}.${baseHost}`;

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Choose your domain
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select how customers will find your website. You can use your own
          domain or get a free subdomain.
        </p>
      </div>

      <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              !hasDomain
                ? "border-teal-500 bg-teal-50"
                : "border-gray-200 hover:border-teal-300"
            }`}
            onClick={() =>
              actions.business.setBusinessInfo({
                domain: { ...business.domain, hasDomain: false },
              })
            }
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Free Subdomain
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Get started quickly with a free subdomain
              </p>
              <div className="text-green-600 font-bold">FREE</div>
              {!hasDomain && (
                <div className="mt-2">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              hasDomain
                ? "border-teal-500 bg-teal-50"
                : "border-gray-200 hover:border-teal-300"
            }`}
            onClick={() =>
              actions.business.setBusinessInfo({
                domain: { ...business.domain, hasDomain: true },
              })
            }
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Custom Domain
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Professional domain for your business
              </p>
              <div className="text-blue-600 font-bold">From $12.99/year</div>
              {hasDomain && (
                <div className="mt-2">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {!hasDomain && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Your Free Website URL
            </h3>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="yourbusiness"
                value={selectedDomain || business.name.toLowerCase().replace(/\s+/g, "")}
                onChange={(e) =>
                  actions.business.setBusinessInfo({
                    domain: { ...business.domain, selectedDomain: e.target.value },
                  })
                }
                className="flex-1"
              />
              <span className="text-gray-500 font-mono">.{baseHost}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Your website will be available at: {displayDomain}
            </p>
          </Card>
        )}

        {hasDomain && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Connect Your Custom Domain
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Enter Your Domain
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      placeholder="e.g. yourbusiness.com"
                      value={domainName}
                      onChange={(e) =>
                        actions.business.setBusinessInfo({
                          domain: { ...business.domain, domainName: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (domainName) {
                          alert(`Domain ${domainName} is ready to connect!`);
                        }
                      }}
                    >
                      Validate
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter a domain you already own or plan to purchase
                  </p>
                </div>

                {domainName && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      DNS Configuration Required
                    </h4>
                    <p className="text-sm text-blue-800 mb-3">
                      To connect your domain, add these DNS records:
                    </p>
                    <div className="bg-white rounded border font-mono text-xs p-3 space-y-1">
                      <div>
                        <strong>A Record:</strong> @ → 76.76.19.61
                      </div>
                      <div>
                        <strong>CNAME:</strong> www → your-site.{baseHost}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Or Search New Domains
              </h3>
              <div className="flex space-x-2 mb-4">
                <Input
                  type="text"
                  placeholder="Enter domain name to search"
                  value={domainSearch}
                  onChange={(e) => setDomainSearch(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline">Search</Button>
              </div>

              <div className="space-y-3">
                {availableDomains.map((domain, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${domain.available ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="font-mono font-medium">
                        {domain.domain}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-sm ${domain.available ? "text-green-600" : "text-red-600"}`}
                      >
                        {domain.price}
                      </span>
                      {domain.available && (
                        <Button
                          size="sm"
                          className="bg-teal-500 hover:bg-teal-600"
                          onClick={() =>
                            actions.business.setBusinessInfo({
                              domain: {
                                ...business.domain,
                                domainName: domain.domain,
                              },
                            })
                          }
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-purple-600" />
                Automated Domain Management
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                We integrate with leading domain and hosting providers for
                seamless setup:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 text-sm mb-1">
                    Vercel
                  </h4>
                  <p className="text-xs text-gray-600">
                    Auto-deploy & custom domains
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 text-sm mb-1">
                    Netlify
                  </h4>
                  <p className="text-xs text-gray-600">
                    Edge functions & DNS management
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 text-sm mb-1">
                    CloudFlare
                  </h4>
                  <p className="text-xs text-gray-600">CDN & security</p>
                </div>
              </div>
            </Card>
          </div>
        )}
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
