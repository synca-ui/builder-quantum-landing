import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Globe, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export interface PublishSettings {
  domain?: string;
  isPublished?: boolean;
  publishedAt?: string;
  sslEnabled?: boolean;
  customDomainVerified?: boolean;
}

interface PublishCardProps {
  settings?: PublishSettings;
  onPublish?: (domain: string) => Promise<void>;
  onUnpublish?: () => Promise<void>;
  businessName?: string;
}

export function PublishCard({
  settings = {},
  onPublish,
  onUnpublish,
  businessName,
}: PublishCardProps) {
  const { toast } = useToast();
  const [customDomain, setCustomDomain] = useState(settings.domain || "");
  const [isLoading, setIsLoading] = useState(false);

  const defaultDomain = businessName
    ? `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.synca.digital`
    : "my-business.synca.digital";

  const currentDomain = settings.domain || defaultDomain;

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      if (onPublish) {
        await onPublish(currentDomain);
        toast({
          title: "Site published!",
          description: `Your site is now live at ${currentDomain}`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Publish failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm("Are you sure? Your site will be taken offline.")) return;

    setIsLoading(true);
    try {
      if (onUnpublish) {
        await onUnpublish();
        toast({
          title: "Site unpublished",
          description: "Your site is now offline",
        });
      }
    } catch (error) {
      toast({
        title: "Unpublish failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`https://${currentDomain}`);
    toast({
      title: "Copied!",
      description: "Domain URL copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div
        className={`border rounded-lg p-4 ${settings.isPublished ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}
      >
        <div className="flex items-start gap-3">
          {settings.isPublished ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Published</h3>
                <p className="text-sm text-green-800 mt-1">
                  Your site is live and visible to the public
                </p>
                {settings.publishedAt && (
                  <p className="text-xs text-green-700 mt-2">
                    Published on{" "}
                    {new Date(settings.publishedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Not Published</h3>
                <p className="text-sm text-gray-800 mt-1">
                  Your site is currently offline. Save and publish to go live.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Domain Selection */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Your Domain
        </h4>

        <div className="space-y-3">
          {/* Default Domain */}
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="domain"
              checked={!settings.domain}
              readOnly
              className="w-4 h-4 text-blue-600"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <code className="text-sm font-mono text-blue-600">
                  https://{defaultDomain}
                </code>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Free Sync.a subdomain (recommended)
              </p>
            </div>
          </label>

          {/* Custom Domain */}
          <div className="border border-gray-300 rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="domain"
                checked={!!settings.domain}
                readOnly
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-900">
                Custom Domain
              </span>
              {settings.customDomainVerified && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  Verified
                </span>
              )}
            </label>

            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="example.com"
              disabled={true}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-600">
              Custom domain support coming in the next update. Contact support
              to get early access.
            </p>
          </div>
        </div>
      </div>

      {/* Domain Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-blue-900">Your Live Site:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded text-sm font-mono text-blue-600 break-all">
            https://{currentDomain}
          </code>
          <button
            onClick={copyToClipboard}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            title="Copy URL"
          >
            <Copy className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Publish Actions */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        {!settings.isPublished ? (
          <Button
            onClick={handlePublish}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-10 font-medium"
          >
            {isLoading ? "Publishing..." : "🚀 Publish Site"}
          </Button>
        ) : (
          <Button
            onClick={handleUnpublish}
            disabled={isLoading}
            variant="destructive"
            className="w-full h-10 font-medium"
          >
            {isLoading ? "Unpublishing..." : "Take Site Offline"}
          </Button>
        )}
      </div>

      {/* Features */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-900 mb-3">
          Publishing Includes:
        </p>
        <ul className="text-xs text-gray-700 space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            Free HTTPS/SSL certificate
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            Lightning-fast CDN delivery
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            SEO-optimized with JSON-LD schema
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            Mobile-responsive design
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            Analytics dashboard
          </li>
        </ul>
      </div>
    </div>
  );
}

export default PublishCard;
