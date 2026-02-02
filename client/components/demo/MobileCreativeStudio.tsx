/**
 * Mobile Creative Studio Component
 * Optimierte Version für mobile Geräte mit Touch-freundlicher Navigation
 */

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Eye,
  Layout,
  Sparkles,
  Smartphone,
  ArrowLeft,
  Share2,
  Download,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LivePhoneFrame } from '@/components/preview/LivePhoneFrame';
import { TemplatePreviewContent } from '@/components/configurator/preview/TemplatePreviewContent';
import { defaultTemplates } from '@/components/template/TemplateRegistry';

interface MobileCreativeStudioProps {
  onBack?: () => void;
}

export default function MobileCreativeStudio({ onBack }: MobileCreativeStudioProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('minimalist');
  const [activeView, setActiveView] = useState<'preview' | 'templates' | 'customize'>('preview');
  const [showFullPreview, setShowFullPreview] = useState(false);

  const templates = defaultTemplates;
  const currentTemplate = templates.find(t => t.id === selectedTemplate) || templates[0];

  if (showFullPreview) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Full Preview Header */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <button
            onClick={() => setShowFullPreview(false)}
            className="flex items-center space-x-2 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Zurück</span>
          </button>
          <span className="font-medium">{currentTemplate.name}</span>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full bg-white/10">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full Preview Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <LivePhoneFrame widthClass="w-[350px]" heightClass="h-[700px]">
            <TemplatePreviewContent />
          </LivePhoneFrame>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">Creative Studio</h1>
              <p className="text-xs text-gray-500">Mobile Editor</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
              <Download className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Preview Bar */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{currentTemplate.name}</p>
              <p className="text-xs text-gray-500">{currentTemplate.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowFullPreview(true)}
            className="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-sm font-medium"
          >
            Vollbild
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {[
            { key: 'preview', label: 'Preview', icon: Eye },
            { key: 'templates', label: 'Templates', icon: Layout },
            { key: 'customize', label: 'Anpassen', icon: Palette }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as any)}
              className={cn(
                'flex-1 flex flex-col items-center py-3 border-b-2 transition-colors',
                activeView === key
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-gray-500'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview Tab */}
        {activeView === 'preview' && (
          <div className="p-4 flex justify-center bg-gradient-to-br from-gray-100 to-gray-200 min-h-full">
            <div className="w-full max-w-sm">
              <LivePhoneFrame widthClass="w-full" heightClass="h-[500px]">
                <TemplatePreviewContent />
              </LivePhoneFrame>

              {/* Preview Controls */}
              <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">Live Preview</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Live</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-center space-x-2 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm">Als App testen</span>
                  </button>
                  <button
                    onClick={() => setShowFullPreview(true)}
                    className="w-full flex items-center justify-center space-x-2 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">Vollbild-Preview</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeView === 'templates' && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Template wählen</h2>
              <p className="text-sm text-gray-600">Wähle das perfekte Design für dein Restaurant</p>
            </div>

            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    'p-4 rounded-xl border-2 cursor-pointer transition-all',
                    selectedTemplate === template.id
                      ? 'border-pink-300 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className="flex items-center space-x-4">
                    {/* Template Preview */}
                    <div className={cn('w-16 h-16 rounded-xl', template.preview)} />

                    {/* Template Info */}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>

                      {/* Template Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.features.slice(0, 2).map((feature, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {selectedTemplate === template.id && (
                      <div className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center">
                        <Eye className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customize Tab */}
        {activeView === 'customize' && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Design anpassen</h2>
              <p className="text-sm text-gray-600">Personalisiere dein Template</p>
            </div>

            <div className="space-y-6">
              {/* Color Customization */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Palette className="w-4 h-4 mr-2" />
                  Farben anpassen
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {currentTemplate.style && [
                    currentTemplate.style.background,
                    currentTemplate.style.accent,
                    currentTemplate.style.text,
                    currentTemplate.style.secondary
                  ].map((color, index) => (
                    <button
                      key={index}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Style Options */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Layout className="w-4 h-4 mr-2" />
                  Layout-Stil
                </h3>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    Aktueller Stil: <span className="font-medium">{currentTemplate.style?.layout}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimierungen
                </h3>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="font-medium text-yellow-800">Performance optimieren</div>
                    <div className="text-sm text-yellow-600">+15% schnellere Ladezeit</div>
                  </button>
                  <button className="w-full text-left p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-green-800">SEO verbessern</div>
                    <div className="text-sm text-green-600">Bessere Suchmaschinen-Sichtbarkeit</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <button className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50">
            Vorschau teilen
          </button>
          <button className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg">
            Design speichern
          </button>
        </div>
      </div>
    </div>
  );
}
