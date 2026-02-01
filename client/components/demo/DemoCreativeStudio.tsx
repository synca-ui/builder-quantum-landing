/**
 * Demo Creative Studio Component - Enterprise SaaS Grade
 * Advanced no-code design system with AI-powered optimization and real-time preview
 */

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sparkles,
  Eye,
  Zap,
  Type,
  Image as ImageIcon,
  Layout,
  Smartphone,
  Monitor,
  Tablet,
  Wand2,
  Target,
  TrendingUp,
  Award,
  RefreshCw,
  Save,
  Share2,
  Code,
  Brush
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  category: 'MODERN' | 'CLASSIC' | 'TRENDY' | 'MINIMALIST';
  preview: string;
  colors: string[];
  description: string;
  popularity: number;
  conversionRate: number;
}

interface DesignElement {
  id: string;
  type: 'header' | 'menu' | 'gallery' | 'contact' | 'footer';
  name: string;
  preview: string;
  customizable: string[];
}

interface AIOptimization {
  id: string;
  type: 'color' | 'layout' | 'typography' | 'imagery';
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  expectedImprovement: string;
}

export default function DemoCreativeStudio() {
  const [selectedTemplate, setSelectedTemplate] = useState('modern-1');
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activePanel, setActivePanel] = useState<'templates' | 'colors' | 'typography' | 'images' | 'ai'>('templates');
  const [showPreview, setShowPreview] = useState(false);
  const [aiOptimizations, setAiOptimizations] = useState<AIOptimization[]>([]);

  // Premium template collection
  const templates: Template[] = [
    {
      id: 'modern-1',
      name: 'Modern Elegance',
      category: 'MODERN',
      preview: '🎨',
      colors: ['#0F172A', '#0D9488', '#F8FAFC', '#7C3AED'],
      description: 'Minimalistisch & Performance-optimiert',
      popularity: 94,
      conversionRate: 8.7
    },
    {
      id: 'classic-1',
      name: 'Classic Heritage',
      category: 'CLASSIC',
      preview: '🏛️',
      colors: ['#1F2937', '#B45309', '#FEF7ED', '#DC2626'],
      description: 'Zeitlos & vertrauenerweckend',
      popularity: 87,
      conversionRate: 7.2
    },
    {
      id: 'trendy-1',
      name: 'Bold & Vibrant',
      category: 'TRENDY',
      preview: '⚡',
      colors: ['#7C2D12', '#F59E0B', '#FEF3C7', '#EF4444'],
      description: 'Auffällig & social media ready',
      popularity: 91,
      conversionRate: 9.1
    },
    {
      id: 'minimal-1',
      name: 'Pure Minimal',
      category: 'MINIMALIST',
      preview: '✨',
      colors: ['#374151', '#6B7280', '#FFFFFF', '#3B82F6'],
      description: 'Clean & fokussiert',
      popularity: 89,
      conversionRate: 8.3
    }
  ];

  // Smart design elements
  const designElements = [
    { id: 'header-1', type: 'header', name: 'Hero Section', preview: '🎯' },
    { id: 'menu-1', type: 'menu', name: 'Food Menu', preview: '🍽️' }
  ];

  // AI-powered optimization suggestions
  useEffect(() => {
    const optimizations: AIOptimization[] = [
      {
        id: 'ai-1',
        type: 'color',
        suggestion: 'Primärfarbe zu #059669 ändern basierend auf Branche-Analyse',
        impact: 'high',
        expectedImprovement: '+23% Conversions'
      },
      {
        id: 'ai-2',
        type: 'layout',
        suggestion: 'CTA-Button 15px höher positionieren für bessere Sichtbarkeit',
        impact: 'medium',
        expectedImprovement: '+12% Click-Rate'
      },
      {
        id: 'ai-3',
        type: 'typography',
        suggestion: 'Font-Size der Überschrift auf 3.2rem erhöhen',
        impact: 'low',
        expectedImprovement: '+5% Engagement'
      }
    ];
    setAiOptimizations(optimizations);
  }, [selectedTemplate]);

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return Monitor;
      case 'tablet': return Tablet;
      case 'mobile': return Smartphone;
      default: return Monitor;
    }
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      'high': 'bg-red-100 text-red-700 border-red-300',
      'medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'low': 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[impact as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <span>Creative Studio</span>
                <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
                  AI-POWERED
                </div>
              </h1>
              <p className="text-gray-600 mt-1">No-Code Design System mit intelligenter Optimierung</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Device Preview Toggle */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              {[
                { key: 'desktop', label: 'Desktop' },
                { key: 'tablet', label: 'Tablet' },
                { key: 'mobile', label: 'Mobile' }
              ].map(({ key, label }) => {
                const IconComponent = getDeviceIcon(key);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDevice(key as 'desktop' | 'tablet' | 'mobile')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center space-x-1',
                      selectedDevice === key
                        ? 'bg-white text-pink-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Smart Actions */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                showPreview ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              <Eye className="w-4 h-4" />
              <span>Live Preview</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
              <Share2 className="w-4 h-4" />
              <span>Teilen</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-md">
              <Save className="w-4 h-4" />
              <span>Publish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Design Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          {
            title: 'Performance Score',
            value: '94/100',
            change: '+8 seit letzter Änderung',
            icon: Target,
            color: 'from-green-500 to-green-600'
          },
          {
            title: 'Conversion Rate',
            value: '8.7%',
            change: '+2.1% vs. Standard-Template',
            icon: TrendingUp,
            color: 'from-blue-500 to-blue-600'
          },
          {
            title: 'Mobile Score',
            value: '98/100',
            change: 'Fully responsive',
            icon: Smartphone,
            color: 'from-purple-500 to-purple-600'
          },
          {
            title: 'AI-Optimierungen',
            value: aiOptimizations.length,
            change: 'Bereit zur Anwendung',
            icon: Sparkles,
            color: 'from-yellow-500 to-orange-600'
          },
          {
            title: 'Design System',
            value: '12/12',
            change: 'Komponenten aktiv',
            icon: Award,
            color: 'from-pink-500 to-pink-600'
          }
        ].map((metric, index) => (
          <div key={index} className="card-elevated bg-white rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center shadow-sm', metric.color)}>
                <metric.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                {metric.change}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-600">{metric.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Design Tools Panel */}
        <div className="xl:col-span-1">
          <div className="card-elevated bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Design Tools</h3>
              <Brush className="w-5 h-5 text-pink-600" />
            </div>

            {/* Tool Navigation */}
            <div className="space-y-2 mb-6">
              {[
                { key: 'templates', label: 'Templates', icon: Layout },
                { key: 'colors', label: 'Farben', icon: Palette },
                { key: 'typography', label: 'Typography', icon: Type },
                { key: 'images', label: 'Bilder', icon: ImageIcon },
                { key: 'ai', label: 'AI Magic', icon: Sparkles }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActivePanel(key as any)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all',
                    activePanel === key
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                      : 'hover:bg-gray-100 text-gray-700'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                  {key === 'ai' && aiOptimizations.length > 0 && (
                    <div className="ml-auto w-6 h-6 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center text-xs font-bold">
                      {aiOptimizations.length}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="space-y-4">
              {/* Templates Panel */}
              {activePanel === 'templates' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Premium Templates</h4>
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        'p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md',
                        selectedTemplate === template.id
                          ? 'border-pink-300 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{template.preview}</span>
                          <div>
                            <p className="font-medium text-gray-900">{template.name}</p>
                            <p className="text-xs text-gray-600">{template.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {template.conversionRate}%
                          </div>
                          <div className="text-xs text-gray-500">Conversion</div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                      {/* Color Palette */}
                      <div className="flex items-center space-x-1">
                        {template.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                          ></div>
                        ))}
                      </div>

                      {/* Popularity Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Beliebtheit</span>
                          <span>{template.popularity}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-pink-400 to-purple-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${template.popularity}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Colors Panel */}
              {activePanel === 'colors' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Smart Color System</h4>

                  {/* Brand Colors */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Markenfarben</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['#0F172A', '#0D9488', '#7C3AED', '#F59E0B'].map((color, index) => (
                        <button
                          key={index}
                          className="w-full aspect-square rounded-lg border-2 border-white shadow-lg hover:scale-105 transition-transform"
                          style={{ backgroundColor: color }}
                        ></button>
                      ))}
                    </div>
                  </div>

                  {/* Color Suggestions */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">AI-Vorschläge</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['#059669', '#DC2626', '#7C2D12'].map((color, index) => (
                        <button
                          key={index}
                          className="w-full aspect-square rounded-lg border-2 border-white shadow-lg hover:scale-105 transition-transform relative group"
                          style={{ backgroundColor: color }}
                        >
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Accessibility */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">AAA Konformität</span>
                    </div>
                    <p className="text-xs text-green-700">
                      Alle Farbkombinationen erfüllen WCAG-Richtlinien
                    </p>
                  </div>
                </div>
              )}

              {/* AI Panel */}
              {activePanel === 'ai' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">AI Magic ✨</h4>
                    <button className="text-xs text-pink-600 hover:text-pink-700 font-medium">
                      Alle anwenden
                    </button>
                  </div>

                  {aiOptimizations.map((optimization) => (
                    <div key={optimization.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {optimization.type.charAt(0).toUpperCase() + optimization.type.slice(1)}
                          </span>
                        </div>
                        <div className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium border',
                          getImpactColor(optimization.impact)
                        )}>
                          {optimization.impact.toUpperCase()}
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">{optimization.suggestion}</p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-green-600">
                          {optimization.expectedImprovement}
                        </span>
                        <button className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-medium rounded-lg hover:shadow-md transition-all">
                          Anwenden
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* AI Actions */}
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                      <Wand2 className="w-5 h-5" />
                      <span>Auto-Optimize Website</span>
                    </button>

                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-purple-300 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-all">
                      <RefreshCw className="w-5 h-5" />
                      <span>Generate New Ideas</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview Canvas */}
        <div className="xl:col-span-3">
          <div className="card-elevated bg-white rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <span>Live Design Preview</span>
                    {showPreview && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {templates.find(t => t.id === selectedTemplate)?.name} • {selectedDevice.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-white rounded-full text-sm font-medium border">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Live</span>
                  </div>
                  <button className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                    <Code className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Container */}
            <div className="p-6 bg-gray-100">
              <div
                className={cn(
                  'mx-auto bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-500',
                  selectedDevice === 'desktop' ? 'w-full h-96' :
                  selectedDevice === 'tablet' ? 'w-4/5 h-80' :
                  'w-64 h-96'
                )}
              >
                {/* Mock Website Preview */}
                <div className="h-full relative">
                  {/* Header */}
                  <div className="h-16 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center px-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg"></div>
                      <span className="text-white font-bold">Restaurant Demo</span>
                    </div>
                    <div className="ml-auto flex items-center space-x-2">
                      <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg text-sm font-medium">
                        Reservieren
                      </div>
                    </div>
                  </div>

                  {/* Hero Section */}
                  <div className="h-32 bg-gradient-to-r from-pink-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20"></div>
                    <div className="relative text-center">
                      <h1 className="text-xl font-bold text-gray-900">Willkommen bei Demo</h1>
                      <p className="text-sm text-gray-600 mt-1">Authentische Küche • Moderne Atmosphäre</p>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 space-y-4">
                    {/* Menu Preview */}
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="bg-gray-100 rounded-lg p-3">
                          <div className="w-full h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-3/4 mb-1"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>

                    {/* Contact Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>

                  {/* AI Optimization Overlay */}
                  {activePanel === 'ai' && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm">
                        <div className="text-center">
                          <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                          <h3 className="font-bold text-gray-900 mb-2">AI Magic Active</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Analyzing design patterns and optimizing for maximum conversion rate...
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full w-3/4 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Dashboard */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Design Performance Analytics</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">Echtzeit-Auswirkungen Ihrer Design-Entscheidungen</p>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
            Detaillierte Analyse
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              title: 'Page Speed',
              value: '94/100',
              trend: '+12 Punkte',
              description: 'Optimierte Assets & Lazy Loading',
              icon: Target,
              color: 'text-green-600',
              bg: 'bg-green-50'
            },
            {
              title: 'User Engagement',
              value: '4:32min',
              trend: '+45% länger',
              description: 'Durchschnittliche Verweildauer',
              icon: Eye,
              color: 'text-blue-600',
              bg: 'bg-blue-50'
            },
            {
              title: 'Conversion Rate',
              value: '8.7%',
              trend: '+2.1% Lift',
              description: 'Reservierungen & Bestellungen',
              icon: TrendingUp,
              color: 'text-purple-600',
              bg: 'bg-purple-50'
            },
            {
              title: 'Mobile Experience',
              value: '98/100',
              trend: 'Perfect Score',
              description: 'Responsive & Touch-optimiert',
              icon: Smartphone,
              color: 'text-orange-600',
              bg: 'bg-orange-50'
            }
          ].map((metric, index) => (
            <div key={index} className={cn('rounded-xl p-6 border', metric.bg)}>
              <div className="flex items-center justify-between mb-4">
                <metric.icon className={cn('w-8 h-8', metric.color)} />
                <span className="text-sm font-medium px-3 py-1 bg-white/80 rounded-full text-gray-700">
                  {metric.trend}
                </span>
              </div>

              <div className="space-y-2">
                <p className={cn('text-3xl font-bold', metric.color)}>{metric.value}</p>
                <p className="text-sm font-medium text-gray-900">{metric.title}</p>
                <p className="text-xs text-gray-600">{metric.description}</p>
              </div>

              {/* Progress visualization */}
              <div className="mt-4">
                <div className="w-full bg-white/60 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      metric.color.includes('green') ? 'bg-gradient-to-r from-green-400 to-green-600' :
                      metric.color.includes('blue') ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                      metric.color.includes('purple') ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                      'bg-gradient-to-r from-orange-400 to-orange-600'
                    )}
                    style={{ width: '85%' }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
