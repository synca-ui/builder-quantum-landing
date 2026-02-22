/**
 * Demo Dashboard Layout Component
 * Public version of the dashboard layout for demonstration purposes
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Users,
  MapPin,
  Palette,
  Settings,
  Calendar,
  Bell,
  User,
  LogIn,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface DemoDashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    title: "Insights",
    href: "/demo-dashboard/insights",
    icon: BarChart3,
    description: "Analytics & Performance",
    gradient: "from-teal-500 to-teal-600",
  },
  {
    title: "Mitarbeiter",
    href: "/demo-dashboard/staff",
    icon: Users,
    description: "Staff & Shift Management",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Mein Lokal",
    href: "/demo-dashboard/floor-plan",
    icon: MapPin,
    description: "Floor Plan Editor",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    title: "Creative Studio",
    href: "/demo-dashboard/creative",
    icon: Palette,
    description: "Templates & App Design",
    gradient: "from-pink-500 to-pink-600",
  },
  {
    title: "Reservierungen",
    href: "/demo-dashboard/reservations",
    icon: Calendar,
    description: "Booking Management",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Admin-Center",
    href: "/demo-dashboard/admin",
    icon: Settings,
    description: "Account & SEO Management",
    gradient: "from-gray-500 to-gray-600",
  },
];

export default function DemoDashboardLayout({
  children,
}: DemoDashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Fixed Demo-Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-teal-600 to-purple-600 text-white p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="font-medium">
              🎯 Demo Dashboard - Erlebe die Maitr Restaurant-Verwaltung
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Zurück zur Startseite</span>
            </button>

            <button
              onClick={() => navigate("/login")}
              className="flex items-center space-x-2 px-4 py-1 bg-white text-teal-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              <LogIn className="w-4 h-4" />
              <span>Jetzt anmelden</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - with top padding for fixed banner */}
      <div
        className="fixed inset-y-0 left-0 z-40 w-80 bg-white shadow-xl"
        style={{ top: "52px" }}
      >
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Maitr</h1>
              <p className="text-xs text-teal-600 font-medium">
                Demo Dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive =
              currentPath.startsWith(item.href) ||
              (currentPath === "/demo-dashboard" &&
                item.href === "/demo-dashboard/insights");

            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left",
                  isActive
                    ? "bg-gradient-to-r text-white shadow-lg transform scale-[1.02]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  isActive && `bg-gradient-to-r ${item.gradient}`,
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                    isActive
                      ? "bg-white/20"
                      : "bg-gray-100 group-hover:bg-gray-200",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5",
                      isActive ? "text-white" : "text-gray-600",
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      isActive ? "text-white" : "text-gray-900",
                    )}
                  >
                    {item.title}
                  </p>
                  <p
                    className={cn(
                      "text-xs truncate",
                      isActive ? "text-white/80" : "text-gray-500",
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Demo Info Section */}
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-teal-50 to-purple-50">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-white border border-teal-100">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-teal-500 to-purple-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900">
                Demo Restaurant
              </p>
              <p className="text-xs text-gray-500 truncate">
                Teste alle Funktionen
              </p>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-gray-600 mb-2">
              Bereit für dein eigenes Restaurant?
            </p>
            <button
              onClick={() => navigate("/signup")}
              className="w-full px-3 py-2 bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-teal-600 hover:to-purple-700 transition-all"
            >
              Kostenlos starten
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-80" style={{ paddingTop: "52px" }}>
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="font-bold text-xl text-gray-900">
                {navigationItems.find(
                  (item) =>
                    currentPath.startsWith(item.href) ||
                    (currentPath === "/demo-dashboard" &&
                      item.href === "/demo-dashboard/insights"),
                )?.title || "Dashboard"}
              </h2>
              <p className="text-sm text-gray-500">
                Demo-Modus - Alle Daten sind Beispieldaten
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Demo</span>
            </div>

            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full"></span>
            </button>

            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-purple-500"></div>
          </div>
        </header>

        {/* Page Content - scrollable */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ height: "calc(100vh - 52px)" }}
        >
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
