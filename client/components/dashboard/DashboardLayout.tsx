/**
 * Dashboard Layout Component
 * Provides the main layout structure with sidebar navigation and content area
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Users,
  Layout,
  Palette,
  Settings,
  Calendar,
  MapPin,
  TrendingUp,
  Bell,
  User,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  businessId?: string;
}

const navigationItems = [
  {
    title: "Insights",
    href: "/dashboard/insights",
    icon: BarChart3,
    description: "Analytics & Performance",
    gradient: "from-teal-500 to-teal-600",
  },
  {
    title: "Mitarbeiter",
    href: "/dashboard/staff",
    icon: Users,
    description: "Staff & Shift Management",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Mein Lokal",
    href: "/dashboard/floor-plan",
    icon: MapPin,
    description: "Floor Plan Editor",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    title: "Creative Studio",
    href: "/dashboard/creative",
    icon: Palette,
    description: "Templates & Menu Design",
    gradient: "from-pink-500 to-pink-600",
  },
  {
    title: "Admin",
    href: "/dashboard/admin",
    icon: Settings,
    description: "Reservations & SEO",
    gradient: "from-gray-500 to-gray-600",
  },
];

export default function DashboardLayout({
  children,
  businessId,
}: DashboardLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Maitr</h1>
              <p className="text-xs text-gray-500">Restaurant Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={`${item.href}${businessId ? `?businessId=${businessId}` : ""}`}
                className={cn(
                  "group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
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
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-100">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-teal-500 to-purple-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900">
                Restaurant Owner
              </p>
              <p className="text-xs text-gray-500 truncate">
                Manage your business
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-80">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="font-bold text-xl text-gray-900">
                {navigationItems.find((item) => item.href === location.pathname)
                  ?.title || "Dashboard"}
              </h2>
              <p className="text-sm text-gray-500">
                {navigationItems.find((item) => item.href === location.pathname)
                  ?.description || "Manage your restaurant"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full"></span>
            </button>

            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-purple-500"></div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
