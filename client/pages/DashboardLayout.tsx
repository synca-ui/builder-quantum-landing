import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, UserButton } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Grid3x3,
  Palette,
  Settings,
  ChevronLeft,
  Menu,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  {
    name: "Insights",
    href: "/dashboard/insights",
    icon: TrendingUp,
    description: "Analytics & Performance",
  },
  {
    name: "Mitarbeiter",
    href: "/dashboard/staff",
    icon: Users,
    description: "Shift Management",
  },
  {
    name: "Mein Lokal",
    href: "/dashboard/floor-plan",
    icon: Grid3x3,
    description: "Table Layout Editor",
  },
  {
    name: "Creative Studio",
    href: "/dashboard/creative",
    icon: Palette,
    description: "Menu & Templates",
  },
  {
    name: "Admin",
    href: "/dashboard/admin",
    icon: Settings,
    description: "SEO & Settings",
  },
];

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (href: string) => location.pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/20 to-purple-50/20">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarOpen ? "w-[300px]" : "w-20"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          {sidebarOpen && (
            <Link
              to="/dashboard"
              className="text-2xl font-black bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              Maitr
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white shadow-lg"
                    : "text-gray-700 hover:bg-gray-100"
                } ${!sidebarOpen && "justify-center"}`}
                title={!sidebarOpen ? item.name : ""}
              >
                <Icon
                  className={`${sidebarOpen ? "w-5 h-5" : "w-6 h-6"} flex-shrink-0`}
                />
                {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p
                      className={`text-xs mt-0.5 ${
                        active ? "text-white/90" : "text-gray-500"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10",
                    },
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Mein Account
                  </p>
                  <p className="text-xs text-gray-500">Einstellungen</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut(() => navigate("/login"))}
                className="p-2"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  },
                }}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          sidebarOpen ? "ml-[300px]" : "ml-20"
        }`}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-full px-8">
            <div>
              <h1
                className="text-xl font-bold text-gray-900"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                {navigation.find((item) => isActive(item.href))?.name ||
                  "Dashboard"}
              </h1>
              <p className="text-sm text-gray-500">
                {navigation.find((item) => isActive(item.href))?.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/configurator">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-teal-200 text-teal-600 hover:bg-teal-50"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Neue App
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{children || <Outlet />}</div>
      </main>
    </div>
  );
}
