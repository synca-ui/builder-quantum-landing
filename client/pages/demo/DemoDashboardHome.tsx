/**
 * Demo Dashboard Home Component
 * Main demo dashboard component with enterprise-grade modules
 */

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DemoDashboardLayout from "../../components/demo/DemoDashboardLayout";
import DemoInsightsBentoGrid from "../../components/demo/DemoInsightsBentoGrid";
import DemoStaffCalendar from "../../components/demo/DemoStaffCalendar";
import DemoFloorPlanEditor from "../../components/demo/DemoFloorPlanEditor";
import DemoCreativeStudio from "../../components/demo/DemoCreativeStudio";
import DemoAdminPanel from "../../components/demo/DemoAdminPanel";
import DemoReservationsDashboard from "../../components/demo/DemoReservationsDashboard";

// Enterprise-grade demo pages
function DemoInsightsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics & Insights
          </h1>
          <p className="text-gray-600 mt-2">
            Enterprise Dashboard: Echtzeit-Übersicht über Performance und
            Geschäftskennzahlen
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option>Heute</option>
            <option>Diese Woche</option>
            <option>Diesen Monat</option>
          </select>

          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm">
            Export (Demo)
          </button>
        </div>
      </div>

      <DemoInsightsBentoGrid />
    </div>
  );
}

function DemoStaffPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-2">
            Enterprise-grade Personalplanung mit intelligenter Optimierung und
            Echtzeit-Analytics
          </p>
        </div>
      </div>
      <DemoStaffCalendar />
    </div>
  );
}

function DemoFloorPlanPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Floor Plan Editor
          </h1>
          <p className="text-gray-600 mt-2">
            Intelligente Raumplanung mit Drag-and-Drop und Revenue-Analytics
          </p>
        </div>
      </div>
      <DemoFloorPlanEditor />
    </div>
  );
}

function DemoCreativeStudioPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creative Studio</h1>
          <p className="text-gray-600 mt-2">
            Live iPhone Preview mit echten Templates und Mobile-optimiertem
            Design
          </p>
        </div>
      </div>
      <DemoCreativeStudio />
    </div>
  );
}

function DemoReservationsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservierungen</h1>
          <p className="text-gray-600 mt-2">
            Vollständiges Buchungsmanagement mit Live-Updates und Guest
            Analytics
          </p>
        </div>
      </div>
      <DemoReservationsDashboard />
    </div>
  );
}

function DemoAdminPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin-Center</h1>
          <p className="text-gray-600 mt-2">
            Account-Verwaltung und SEO-Optimization für maximale Sichtbarkeit
          </p>
        </div>
      </div>
      <DemoAdminPanel />
    </div>
  );
}

export default function DemoDashboardHome() {
  return (
    <DemoDashboardLayout>
      <Routes>
        {/* Default route redirects to insights */}
        <Route
          path="/"
          element={<Navigate to="/demo-dashboard/insights" replace />}
        />
        <Route path="/insights" element={<DemoInsightsPage />} />
        <Route path="/staff" element={<DemoStaffPage />} />
        <Route path="/floor-plan" element={<DemoFloorPlanPage />} />
        <Route path="/creative" element={<DemoCreativeStudioPage />} />
        <Route path="/reservations" element={<DemoReservationsPage />} />
        <Route path="/admin" element={<DemoAdminPage />} />

        {/* Fallback for any unmatched routes */}
        <Route
          path="*"
          element={<Navigate to="/demo-dashboard/insights" replace />}
        />
      </Routes>

      {/* Footer with Legal Links & Cookie Banner for Demo Env */}
      <footer className="mt-12 pt-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-gray-500 text-center md:text-left">
            © {new Date().getFullYear()} Maitr — Der digitale Gastgeber für
            Gastronomie.
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2">
            <a href="/pricing" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Preise
            </a>
            <a href="/docs" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Docs
            </a>
            <a href="/contact" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Kontakt
            </a>
            <a href="/impressum" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Impressum
            </a>
            <a href="/datenschutz" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              Datenschutz
            </a>
            <a href="/agb" className="text-sm font-medium text-gray-600 hover:text-teal-600">
              AGB
            </a>
            <button
              onClick={() => {
                const event = new CustomEvent("open-cookie-settings");
                window.dispatchEvent(event);
              }}
              className="text-sm font-medium text-gray-600 hover:text-teal-600 flex items-center gap-1"
            >
              <span>🍪</span>
              Cookie-Einstellungen
            </button>
          </div>
        </div>
      </footer>
    </DemoDashboardLayout>
  );
}
