/**
 * Demo Staff Calendar Component
 * Public demo version with realistic mock data
 */

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Plus,
  UserCheck,
  Users,
  Eye
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface DemoStaff {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  hourlyRate?: number;
}

interface DemoShift {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'REGULAR' | 'OVERTIME' | 'HOLIDAY';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  staff: DemoStaff;
  notes?: string;
}

export default function DemoStaffCalendar() {
  const [selectedDate] = useState(new Date());
  const [showDemo, setShowDemo] = useState(true);

  // Mock staff data
  const demoStaff: DemoStaff[] = [
    { id: '1', firstName: 'Anna', lastName: 'Mueller', position: 'Manager', hourlyRate: 18.5 },
    { id: '2', firstName: 'Marco', lastName: 'Schmidt', position: 'Chef', hourlyRate: 22.0 },
    { id: '3', firstName: 'Lisa', lastName: 'Weber', position: 'Service', hourlyRate: 15.0 },
    { id: '4', firstName: 'Tom', lastName: 'Fischer', position: 'Service', hourlyRate: 15.0 },
    { id: '5', firstName: 'Sarah', lastName: 'Bauer', position: 'Barista', hourlyRate: 13.5 },
  ];

  // Get current week dates
  const getWeekDates = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();

  // Generate realistic demo shifts
  const generateDemoShifts = (): DemoShift[] => {
    const shifts: DemoShift[] = [];

    weekDates.forEach((date, dayIndex) => {
      // Skip Sundays and add realistic shifts for other days
      if (dayIndex === 0) return;

      demoStaff.forEach((staff, staffIndex) => {
        // Different shift patterns for different roles
        const shiftPatterns = {
          Manager: [{ start: 9, duration: 10 }, { start: 15, duration: 8 }],
          Chef: [{ start: 8, duration: 8 }, { start: 16, duration: 6 }],
          Service: [{ start: 10, duration: 6 }, { start: 17, duration: 6 }],
          Barista: [{ start: 7, duration: 8 }],
        };

        const patterns = shiftPatterns[staff.position as keyof typeof shiftPatterns] || [{ start: 9, duration: 8 }];

        // 70% chance of having a shift on weekdays
        if (Math.random() < 0.7) {
          const pattern = patterns[Math.floor(Math.random() * patterns.length)];
          shifts.push({
            id: `${dayIndex}-${staffIndex}`,
            staffId: staff.id,
            date: date.toISOString().split('T')[0],
            startTime: `${String(pattern.start).padStart(2, '0')}:00`,
            endTime: `${String(pattern.start + pattern.duration).padStart(2, '0')}:00`,
            shiftType: dayIndex === 6 ? 'OVERTIME' : 'REGULAR',
            status: dayIndex < 3 ? 'COMPLETED' : 'SCHEDULED',
            staff,
            notes: Math.random() > 0.8 ? 'Wichtige Notiz' : undefined,
          });
        }
      });
    });

    return shifts;
  };

  const demoShifts = generateDemoShifts();

  const getShiftsForDateAndStaff = (date: Date, staffId: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return demoShifts.filter(shift => shift.date === dateStr && shift.staffId === staffId);
  };

  const getShiftStatusColor = (status: DemoShift['status']) => {
    const colors = {
      SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
      IN_PROGRESS: 'bg-green-100 text-green-700 border-green-200',
      COMPLETED: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status];
  };

  const getPositionColor = (position: string) => {
    const colors = {
      Manager: 'bg-purple-500',
      Chef: 'bg-orange-500',
      Service: 'bg-blue-500',
      Barista: 'bg-green-500',
    };
    return colors[position as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      {showDemo && (
        <div className="card-elevated bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Demo Mitarbeiterplanung</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Erlebe das Drag-and-Drop Schichtsystem mit automatischer Konflikterkennung.
                  Alle Daten sind Beispieldaten für Demo-Zwecke.
                </p>
                <div className="flex items-center space-x-4 text-sm text-blue-600">
                  <span>✓ Drag-and-Drop Planung</span>
                  <span>✓ Automatische Konflikte</span>
                  <span>✓ Echtzeit Updates</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDemo(false)}
              className="text-blue-400 hover:text-blue-600 transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Schichtplanung (Demo)</h2>
              <p className="text-sm text-gray-500">
                Woche vom {weekDates[0].toLocaleDateString('de-DE')} - {weekDates[6].toLocaleDateString('de-DE')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all">
              <Plus className="w-4 h-4" />
              <span>Schicht hinzufügen (Demo)</span>
            </button>
          </div>
        </div>

        {/* Demo Features Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Konflikt-Erkennung</p>
                <p className="text-xs text-gray-500">Automatische Überschneidungs-Prüfung</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Stundenberechnung</p>
                <p className="text-xs text-gray-500">Automatische Lohn-Kalkulation</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Urlaubs-Integration</p>
                <p className="text-xs text-gray-500">Abwesenheiten berücksichtigen</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card-elevated bg-white rounded-2xl overflow-hidden">
        <div className="grid grid-cols-8 bg-gray-50">
          {/* Header Row */}
          <div className="p-4 text-sm font-semibold text-gray-600 border-r border-gray-200">
            Mitarbeiter
          </div>
          {weekDates.map((date, index) => (
            <div key={index} className="p-4 text-center border-r border-gray-200 last:border-r-0">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                {date.toLocaleDateString('de-DE', { weekday: 'short' })}
              </div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Staff Rows */}
        <div className="divide-y divide-gray-200">
          {demoStaff.map((staff) => (
            <div key={staff.id} className="grid grid-cols-8">
              {/* Staff Info */}
              <div className="p-4 bg-gray-50 border-r border-gray-200 flex items-center space-x-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white',
                  getPositionColor(staff.position)
                )}>
                  {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {staff.firstName} {staff.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{staff.position}</p>
                </div>
              </div>

              {/* Daily Shifts */}
              {weekDates.map((date, dateIndex) => {
                const dayShifts = getShiftsForDateAndStaff(date, staff.id);

                return (
                  <div
                    key={dateIndex}
                    className="p-2 min-h-[120px] border-r border-gray-200 last:border-r-0 space-y-1"
                  >
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={cn(
                          'p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                          getShiftStatusColor(shift.status)
                        )}
                      >
                        <div className="flex items-center space-x-1 text-xs">
                          <Clock className="w-3 h-3" />
                          <span>{shift.startTime} - {shift.endTime}</span>
                        </div>
                        {shift.notes && (
                          <p className="text-xs mt-1 truncate">{shift.notes}</p>
                        )}
                        <div className="text-xs mt-1 opacity-75">
                          {shift.shiftType === 'OVERTIME' ? 'Überstunden' : 'Regulär'}
                        </div>
                      </div>
                    ))}

                    {/* Empty Day Placeholder */}
                    {dayShifts.length === 0 && (
                      <div className="h-full min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-teal-300 hover:text-teal-500 transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Staff Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-elevated bg-white rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{demoStaff.length}</p>
              <p className="text-sm text-gray-500">Demo Mitarbeiter</p>
            </div>
          </div>
        </div>

        <div className="card-elevated bg-white rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{demoShifts.length}</p>
              <p className="text-sm text-gray-500">Demo Schichten</p>
            </div>
          </div>
        </div>

        <div className="card-elevated bg-white rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {Math.round(demoShifts.reduce((acc, shift) => {
                  const start = parseInt(shift.startTime.split(':')[0]);
                  const end = parseInt(shift.endTime.split(':')[0]);
                  return acc + (end - start);
                }, 0))}h
              </p>
              <p className="text-sm text-gray-500">Demo Stunden/Woche</p>
            </div>
          </div>
        </div>

        <div className="card-elevated bg-white rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Konflikte erkannt</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
