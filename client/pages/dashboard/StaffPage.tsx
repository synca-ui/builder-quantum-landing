/**
 * Staff Management Dashboard Page
 * Employee scheduling and shift management with drag-and-drop
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import StaffCalendar from '../../components/dashboard/StaffCalendar';

export default function StaffPage() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('businessId') || undefined;

  return (
    <DashboardLayout businessId={businessId}>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter & Schichten</h1>
            <p className="text-gray-600 mt-2">
              Personalplanung mit Drag-and-Drop und automatischer Konflikterkennung
            </p>
          </div>
        </div>

        {/* Main Staff Calendar */}
        <StaffCalendar businessId={businessId} />
      </div>
    </DashboardLayout>
  );
}
