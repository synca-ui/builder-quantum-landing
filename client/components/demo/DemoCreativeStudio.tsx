/**
 * Demo Creative Studio Component
 */

import React, { useState } from 'react';
import { Palette, Layout, Wand2, Star, Crown, Settings, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function DemoCreativeStudio() {
  const [activeTab, setActiveTab] = useState<'templates' | 'ai'>('templates');
  const [showDemo, setShowDemo] = useState(true);

  const demoTemplates = [
    { id: '1', name: 'Modern Minimal', category: 'Modern', isPremium: false, rating: 4.8, downloads: 1240 },
    { id: '2', name: 'Stylish Premium', category: 'Stylish', isPremium: true, rating: 4.9, downloads: 890 },
    { id: '3', name: 'Cozy Warmth', category: 'Cozy', isPremium: false, rating: 4.7, downloads: 650 },
  ];

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      {showDemo && (
        <div className="card-elevated bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-pink-900 mb-2">Demo Creative Studio</h3>
                <p className="text-pink-700 text-sm mb-3">
                  Teste den No-Code Template-Editor und KI-Assistenten. Alle Templates und Funktionen sind voll funktionsfähig.
                </p>
                <div className="flex items-center space-x-4 text-sm text-pink-600">
                  <span>✓ Template Gallery</span>
                  <span>✓ KI-Optimierung</span>
                  <span>✓ Menü-Editor</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDemo(false)}
              className="text-pink-400 hover:text-pink-600 transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="card-elevated bg-white rounded-2xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { key: 'templates', label: 'Templates (Demo)', icon: Layout },
              { key: 'ai', label: 'KI Assistent (Demo)', icon: Wand2 },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors relative',
                  activeTab === tab.key
                    ? 'text-teal-600 bg-teal-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>

                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-purple-600"></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Template-Bibliothek (Demo)</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Wähle ein Template und passe es an deine Marke an
                  </p>
                </div>
              </div>

              {/* Current Template */}
              <div className="card-elevated bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-100 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-r from-teal-500 to-purple-600 flex items-center justify-center">
                      <Layout className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900">Modern Minimal (Demo)</h4>
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                          Aktiv
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Clean, modern design with focus on typography</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600">4.8</span>
                        </div>
                        <span className="text-sm text-gray-500">1.240 Downloads</span>
                      </div>
                    </div>
                  </div>

                  <button className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Settings className="w-4 h-4" />
                    <span>Anpassen (Demo)</span>
                  </button>
                </div>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {demoTemplates.map(template => (
                  <div
                    key={template.id}
                    className="card-elevated bg-white rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Layout className="w-12 h-12 text-gray-400" />
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          {template.isPremium && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>

                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          template.category === 'Modern' && 'bg-blue-100 text-blue-700',
                          template.category === 'Stylish' && 'bg-purple-100 text-purple-700',
                          template.category === 'Cozy' && 'bg-orange-100 text-orange-700'
                        )}>
                          {template.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600">{template.rating}</span>
                        </div>

                        <span className="text-sm text-gray-500">
                          {template.downloads.toLocaleString()} Downloads
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Assistant Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">KI-gestützte Optimierung (Demo)</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Lasse dich von unserer KI bei der Optimierung deiner Website helfen
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-elevated bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Farbschema-Optimierung</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Optimiere Farben basierend auf deiner Küchenart für bessere Conversion
                      </p>
                      <button className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
                        Demo Analyse starten →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-elevated bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Menü-Optimierung</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Verbessere Beschreibungen und Preisstrategien für höhere Umsätze
                      </p>
                      <button className="text-sm text-green-600 font-medium hover:text-green-700 transition-colors">
                        Demo Analyse starten →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-elevated bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                      <Layout className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Layout-Verbesserung</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Optimiere das Layout für bessere Benutzerfreundlichkeit
                      </p>
                      <button className="text-sm text-purple-600 font-medium hover:text-purple-700 transition-colors">
                        Demo Analyse starten →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-elevated bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">SEO-Verbesserung</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Optimiere Inhalte für bessere Suchmaschinen-Rankings
                      </p>
                      <button className="text-sm text-orange-600 font-medium hover:text-orange-700 transition-colors">
                        Demo Analyse starten →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
