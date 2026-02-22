/**
 * Demo Creative Studio Component - Enterprise SaaS Grade
 * Advanced no-code design system with intelligente Optimierung and real-time preview
 */

import React, { useState, useEffect } from "react";
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
  Target,
  TrendingUp,
  Award,
  RefreshCw,
  Save,
  Share2,
  Code,
  Brush,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LivePhoneFrame } from "@/components/preview/LivePhoneFrame";
import { TemplatePreviewContent } from "@/components/configurator/preview/TemplatePreviewContent";
import { defaultTemplates } from "@/components/template/TemplateRegistry";
import MobileCreativeStudio from "./MobileCreativeStudio";

interface OptimizationSuggestion {
  id: string;
  type: "color" | "layout" | "typography" | "imagery";
  suggestion: string;
  impact: "high" | "medium" | "low";
  expectedImprovement: string;
}

export default function DemoCreativeStudio() {
  const [selectedTemplate, setSelectedTemplate] = useState("minimalist");
  const [selectedDevice, setSelectedDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("mobile");
  const [activePanel, setActivePanel] = useState<
    "templates" | "colors" | "typography" | "images" | "optimization"
  >("templates");
  const [showPreview, setShowPreview] = useState(true);
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>(
    [],
  );
  const [isMobileView, setIsMobileView] = useState(false);

  // Use real templates from database/registry
  const templates = defaultTemplates;

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Smart optimization suggestions
  useEffect(() => {
    const suggestions: OptimizationSuggestion[] = [
      {
        id: "opt-1",
        type: "color",
        suggestion:
          "Primärfarbe zu #059669 ändern basierend auf Branche-Analyse",
        impact: "high",
        expectedImprovement: "+23% Conversions",
      },
      {
        id: "opt-2",
        type: "layout",
        suggestion:
          "CTA-Button 15px höher positionieren für bessere Sichtbarkeit",
        impact: "medium",
        expectedImprovement: "+12% Click-Rate",
      },
      {
        id: "opt-3",
        type: "typography",
        suggestion: "Font-Size der Überschrift auf 3.2rem erhöhen",
        impact: "low",
        expectedImprovement: "+5% Engagement",
      },
    ];
    setOptimizations(suggestions);
  }, [selectedTemplate]);

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "desktop":
        return Monitor;
      case "tablet":
        return Tablet;
      case "mobile":
        return Smartphone;
      default:
        return Monitor;
    }
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      high: "bg-red-100 border-red-300 text-red-700",
      medium: "bg-yellow-100 border-yellow-300 text-yellow-700",
      low: "bg-green-100 border-green-300 text-green-700",
    };
    return colors[impact as keyof typeof colors] || colors.medium;
  };

  // Get selected template data
  const currentTemplate =
    templates.find((t) => t.id === selectedTemplate) || templates[0];

  // Mobile optimized render
  if (isMobileView) {
    return <MobileCreativeStudio />;
  }

  return (
    <div className="space-y-6">
      {/* Creative Studio Header */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Brush className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <span>Creative Studio</span>
                <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
                  SMART STUDIO
                </div>
              </h1>
              <p className="text-gray-600 mt-1">
                No-Code Design System mit intelligenter Optimierung
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Device Preview Toggle */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              {[
                { key: "desktop", label: "Desktop" },
                { key: "tablet", label: "Tablet" },
                { key: "mobile", label: "Mobile" },
              ].map(({ key, label }) => {
                const IconComponent = getDeviceIcon(key);
                return (
                  <button
                    key={key}
                    onClick={() =>
                      setSelectedDevice(key as "desktop" | "tablet" | "mobile")
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center space-x-1",
                      selectedDevice === key
                        ? "bg-white text-pink-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900",
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
                "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                showPreview
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              )}
            >
              <Eye className="w-4 h-4" />
              <span>{showPreview ? "Live Preview" : "Preview aus"}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
              <Save className="w-4 h-4" />
              <span>Design speichern</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Design Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          {
            title: "Performance Score",
            value: "94/100",
            change: "+8 seit letzter Änderung",
            icon: Target,
            color: "from-green-500 to-green-600",
          },
          {
            title: "Conversion Rate",
            value: "8.7%",
            change: "+2.1% vs. Standard-Template",
            icon: TrendingUp,
            color: "from-blue-500 to-blue-600",
          },
          {
            title: "Mobile Score",
            value: "98/100",
            change: "Fully responsive",
            icon: Smartphone,
            color: "from-purple-500 to-purple-600",
          },
          {
            title: "Optimierungen",
            value: "8",
            change: "Bereit zur Anwendung",
            icon: Sparkles,
            color: "from-yellow-500 to-orange-600",
          },
          {
            title: "Design System",
            value: "12/12",
            change: "Komponenten aktiv",
            icon: Award,
            color: "from-pink-500 to-pink-600",
          },
        ].map((metric, index) => (
          <div
            key={index}
            className="card-elevated bg-white rounded-xl p-4 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center shadow-sm",
                  metric.color,
                )}
              >
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
                { key: "templates", label: "Templates", icon: Layout },
                { key: "colors", label: "Farben", icon: Palette },
                { key: "typography", label: "Typography", icon: Type },
                { key: "images", label: "Bilder", icon: ImageIcon },
                { key: "optimization", label: "Optimierung", icon: Sparkles },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActivePanel(key as any)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all",
                    activePanel === key
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                      : "hover:bg-gray-100 text-gray-700",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                  {key === "optimization" && optimizations.length > 0 && (
                    <div className="ml-auto w-6 h-6 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center text-xs font-bold">
                      {optimizations.length}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="space-y-4">
              {/* Templates Panel */}
              {activePanel === "templates" && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Verfügbare Templates
                  </h4>
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                        selectedTemplate === template.id
                          ? "border-pink-300 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-lg",
                              template.preview,
                            )}
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {template.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {template.businessTypes.join(", ")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {selectedTemplate === template.id && (
                            <div className="w-6 h-6 bg-pink-600 text-white rounded-full flex items-center justify-center">
                              <Eye className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {template.description}
                      </p>

                      {/* Template Features */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.features.map((feature, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Template Style Preview */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Style:</span>
                        <div className="flex space-x-1">
                          <div
                            className="w-4 h-4 rounded border border-gray-200"
                            style={{
                              backgroundColor: template.style.background,
                            }}
                          />
                          <div
                            className="w-4 h-4 rounded border border-gray-200"
                            style={{ backgroundColor: template.style.accent }}
                          />
                          <div
                            className="w-4 h-4 rounded border border-gray-200"
                            style={{ backgroundColor: template.style.text }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Optimization Panel */}
              {activePanel === "optimization" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      Optimierungsvorschläge ✨
                    </h4>
                    <button className="text-xs text-pink-600 hover:text-pink-700 font-medium">
                      Alle anwenden
                    </button>
                  </div>

                  {optimizations.map((optimization) => (
                    <div
                      key={optimization.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {optimization.type.charAt(0).toUpperCase() +
                              optimization.type.slice(1)}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium border",
                            getImpactColor(optimization.impact),
                          )}
                        >
                          {optimization.impact.toUpperCase()}
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">
                        {optimization.suggestion}
                      </p>

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

                  {/* Optimization Actions */}
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                      <Sparkles className="w-5 h-5" />
                      <span>Intelligente Analyse starten</span>
                    </button>

                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-purple-300 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-all">
                      <RefreshCw className="w-5 h-5" />
                      <span>Neue Vorschläge generieren</span>
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
                    {currentTemplate.name} • Live iPhone Preview
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

            {/* Live Preview Container */}
            <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 relative">
              <div className="flex justify-center">
                <LivePhoneFrame
                  widthClass="w-[320px]"
                  heightClass="h-[650px]"
                  className="transform transition-all duration-500 hover:scale-105"
                >
                  <TemplatePreviewContent />
                </LivePhoneFrame>
              </div>

              {/* Optimization Overlay */}
              {activePanel === "optimization" && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-2xl">
                  <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="font-bold text-gray-900 mb-2">
                        Optimierung Aktiv
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Analysiere Design-Patterns und optimiere für maximale
                        Conversion-Rate...
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
  );
}
