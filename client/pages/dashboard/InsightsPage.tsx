/**
 * Insights Dashboard Page
 * Real-time analytics and performance metrics
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import InsightsBentoGrid from '../../components/dashboard/InsightsBentoGrid';

export default function InsightsPage() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('businessId') || undefined;

  return (
    <DashboardLayout businessId={businessId}>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
            <p className="text-gray-600 mt-2">
              Echtzeit-Übersicht über Performance und Geschäftskennzahlen
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Heute</option>
              <option>Diese Woche</option>
              <option>Diesen Monat</option>
            </select>

            <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm">
              Export
            </button>
          </div>
        </div>

        {/* Main Analytics Grid */}
        <InsightsBentoGrid businessId={businessId} />
      </div>
    </DashboardLayout>
  );
}
