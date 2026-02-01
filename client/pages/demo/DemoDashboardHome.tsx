/**
 * Demo Dashboard Home Component
 * Main demo dashboard component with enterprise-grade modules
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DemoDashboardLayout from '../../components/demo/DemoDashboardLayout';
import DemoInsightsBentoGrid from '../../components/demo/DemoInsightsBentoGrid';
import DemoStaffCalendar from '../../components/demo/DemoStaffCalendar';
import DemoFloorPlanEditor from '../../components/demo/DemoFloorPlanEditor';
import DemoCreativeStudio from '../../components/demo/DemoCreativeStudio';
import DemoAdminPanel from '../../components/demo/DemoAdminPanel';

// Enterprise-grade demo pages
function DemoInsightsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-2">
            Enterprise Dashboard: Echtzeit-Übersicht über Performance und Geschäftskennzahlen
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
            Enterprise-grade Personalplanung mit KI-Optimierung und Echtzeit-Analytics
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
          <h1 className="text-3xl font-bold text-gray-900">Floor Plan Editor</h1>
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
            No-Code Design System mit KI-Optimierung und Multi-Device Preview
          </p>
        </div>
      </div>
      <DemoCreativeStudio />
    </div>
  );
}

function DemoAdminPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Center</h1>
          <p className="text-gray-600 mt-2">
            Enterprise Admin Dashboard mit System-Monitoring und Security Center
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
