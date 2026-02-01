/**
 * Demo Dashboard Home Component
 * Main demo dashboard component with all modules inline for simplicity
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DemoDashboardLayout from '../../components/demo/DemoDashboardLayout';
import DemoInsightsBentoGrid from '../../components/demo/DemoInsightsBentoGrid';

// Simple inline components for demo pages
function DemoInsightsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-2">
            Demo-Version: Echtzeit-Übersicht über Performance und Geschäftskennzahlen
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
      <div className="card-elevated bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Demo Mitarbeiterplanung</h3>
        <p className="text-blue-700 text-sm">
          Diese Seite würde das vollständige Schichtplanungs-System mit Drag-and-Drop und Konflikterkennung zeigen.
          In der echten Version können Sie hier Ihre Mitarbeiter verwalten und Schichten planen.
        </p>
      </div>
    </div>
  );
}

function DemoFloorPlanPage() {
  return (
    <div className="space-y-8">
      <div className="card-elevated bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
        <h3 className="font-semibold text-purple-900 mb-2">Demo Lageplan-Editor</h3>
        <p className="text-purple-700 text-sm">
          Hier würden Sie Ihren interaktiven Lageplan bearbeiten, Tische verschieben und QR-Codes für das Bestellen generieren.
          Die Drag-and-Drop Funktionalität ist vollständig implementiert.
        </p>
      </div>
    </div>
  );
}

function DemoCreativeStudioPage() {
  return (
    <div className="space-y-8">
      <div className="card-elevated bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-6">
        <h3 className="font-semibold text-pink-900 mb-2">Demo Creative Studio</h3>
        <p className="text-pink-700 text-sm">
          Das Creative Studio bietet Template-Wechsel, KI-gestützte Optimierungen und einen No-Code-Editor für Ihr Menü.
          Alle Features sind in der Vollversion verfügbar.
        </p>
      </div>
    </div>
  );
}

function DemoAdminPage() {
  return (
    <div className="space-y-8">
      <div className="card-elevated bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Demo Admin & Verwaltung</h3>
        <p className="text-gray-600 text-sm">
          Verwalten Sie Reservierungen, überwachen Sie SEO-Gesundheit und behalten Sie den Systemstatus im Blick.
          Alle Verwaltungstools sind in der echten Version verfügbar.
        </p>
      </div>
    </div>
  );
}

export default function DemoDashboardHome() {
  return (
    <DemoDashboardLayout>
      <Routes>
        {/* Default route redirects to insights */}
        <Route path="/" element={<Navigate to="/demo-dashboard/insights" replace />} />
        <Route path="/insights" element={<DemoInsightsPage />} />
        <Route path="/staff" element={<DemoStaffPage />} />
        <Route path="/floor-plan" element={<DemoFloorPlanPage />} />
        <Route path="/creative" element={<DemoCreativeStudioPage />} />
        <Route path="/admin" element={<DemoAdminPage />} />

        {/* Fallback for any unmatched routes */}
        <Route path="*" element={<Navigate to="/demo-dashboard/insights" replace />} />
      </Routes>
    </DemoDashboardLayout>
  );
}
