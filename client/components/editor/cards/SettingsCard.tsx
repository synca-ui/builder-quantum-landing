import React, { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export interface SiteSettings {
  siteTitle?: string;
  siteDescription?: string;
  metaKeywords?: string;
  googleAnalyticsId?: string;
  customCss?: string;
  customJs?: string;
  faviconUrl?: string;
  siteLogo?: string;
}

interface SettingsCardProps {
  settings?: SiteSettings;
  onChange?: (settings: SiteSettings) => void;
}

export function SettingsCard({ settings = {}, onChange }: SettingsCardProps) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(settings || {
    siteTitle: '',
    siteDescription: '',
    metaKeywords: '',
    googleAnalyticsId: '',
    customCss: '',
    customJs: '',
    faviconUrl: '',
    siteLogo: ''
  });

  const handleChange = (key: keyof SiteSettings, value: string) => {
    const updated = { ...siteSettings, [key]: value };
    setSiteSettings(updated);
    onChange?.(updated);
  };

  return (
    <div className="space-y-6">
      {/* SEO Settings */}
      <div className="border-b border-gray-200 pb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">SEO Settings</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Site Title</label>
            <input
              type="text"
              value={siteSettings.siteTitle || ''}
              onChange={(e) => handleChange('siteTitle', e.target.value)}
              placeholder="Your Business Name | Category"
              maxLength={60}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">{(siteSettings.siteTitle || '').length}/60 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Meta Description</label>
            <textarea
              value={siteSettings.siteDescription || ''}
              onChange={(e) => handleChange('siteDescription', e.target.value)}
              placeholder="Describe your business in 150-160 characters..."
              maxLength={160}
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">{(siteSettings.siteDescription || '').length}/160 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Meta Keywords</label>
            <input
              type="text"
              value={siteSettings.metaKeywords || ''}
              onChange={(e) => handleChange('metaKeywords', e.target.value)}
              placeholder="e.g., restaurant, dining, food, berlin"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="border-b border-gray-200 pb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Analytics</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700">Google Analytics ID</label>
          <input
            type="text"
            value={siteSettings.googleAnalyticsId || ''}
            onChange={(e) => handleChange('googleAnalyticsId', e.target.value)}
            placeholder="e.g., G-XXXXXXXXXX"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Find your ID in Google Analytics settings</p>
        </div>
      </div>

      {/* Assets */}
      <div className="border-b border-gray-200 pb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Site Assets</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo URL</label>
            <input
              type="url"
              value={siteSettings.siteLogo || ''}
              onChange={(e) => handleChange('siteLogo', e.target.value)}
              placeholder="https://example.com/logo.png"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Favicon URL</label>
            <input
              type="url"
              value={siteSettings.faviconUrl || ''}
              onChange={(e) => handleChange('faviconUrl', e.target.value)}
              placeholder="https://example.com/favicon.ico"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Advanced */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Advanced</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Custom CSS</label>
            <textarea
              value={siteSettings.customCss || ''}
              onChange={(e) => handleChange('customCss', e.target.value)}
              placeholder=".my-custom-class { color: blue; }"
              rows={4}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Custom JavaScript</label>
            <textarea
              value={siteSettings.customJs || ''}
              onChange={(e) => handleChange('customJs', e.target.value)}
              placeholder="console.log('Custom script');"
              rows={4}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            />
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              ⚠️ Use custom code carefully. Invalid code may break your site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsCard;
