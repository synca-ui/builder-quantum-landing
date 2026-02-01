/**
 * Staff Calendar Component
 * Drag-and-drop shift management with conflict resolution
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Plus,
  UserCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  isActive: boolean;
  hourlyRate?: number;
}

interface Shift {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'REGULAR' | 'OVERTIME' | 'HOLIDAY' | 'EMERGENCY';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  staff: Staff;
  notes?: string;
}

interface ShiftConflict {
  type: string;
  message: string;
  details: any[];
}

export default function StaffCalendar({ businessId }: { businessId?: string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [conflicts, setConflicts] = useState<ShiftConflict[]>([]);
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [showAddShift, setShowAddShift] = useState(false);

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

  useEffect(() => {
    fetchStaff();
    fetchShifts();
  }, [businessId, selectedDate]);

  const fetchStaff = async () => {
    try {
      // Use demo data for now
      const mockStaff: Staff[] = [
        {
          id: 'staff-1',
          firstName: 'Anna',
          lastName: 'Mueller',
          position: 'Manager',
          isActive: true,
          hourlyRate: 18.5,
        },
        {
          id: 'staff-2',
          firstName: 'Marco',
          lastName: 'Schmidt',
          position: 'Chef',
          isActive: true,
          hourlyRate: 22.0,
        },
        {
          id: 'staff-3',
          firstName: 'Lisa',
          lastName: 'Weber',
          position: 'Service',
          isActive: true,
          hourlyRate: 15.0,
        },
        {
          id: 'staff-4',
          firstName: 'Tom',
          lastName: 'Fischer',
          position: 'Service',
          isActive: true,
          hourlyRate: 15.0,
        },
      ];

      setStaff(mockStaff);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      setLoading(true);

      // Generate mock shifts for the current week
      const mockShifts: Shift[] = [];
      weekDates.forEach((date, dayIndex) => {
        // Skip past dates and add some shifts
        if (dayIndex < 2 || dayIndex > 5) return;

        staff.forEach((member, staffIndex) => {
          if (Math.random() > 0.6) { // 40% chance of shift
            const startHour = 8 + Math.floor(Math.random() * 8); // 8-16
            const duration = 6 + Math.floor(Math.random() * 4); // 6-10 hours

            mockShifts.push({
              id: `shift-${dayIndex}-${staffIndex}`,
              staffId: member.id,
              date: date.toISOString().split('T')[0],
              startTime: `${String(startHour).padStart(2, '0')}:00`,
              endTime: `${String(startHour + duration).padStart(2, '0')}:00`,
              shiftType: 'REGULAR',
              status: 'SCHEDULED',
              staff: member,
            });
          }
        });
      });

      setShifts(mockShifts);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async (shift: Partial<Shift>) => {
    // Mock conflict checking based on shift data
    const hasConflict = Math.random() < 0.2 || shift.staffId === 'conflict-test-id';

    if (hasConflict) {
      setConflicts([{
        type: 'shift_overlap',
        message: 'Mitarbeiter hat bereits eine Schicht zu dieser Zeit',
        details: [],
      }]);
    } else {
      setConflicts([]);
    }
  };

  const handleDragStart = (shift: Shift) => {
    setDraggedShift(shift);
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
  };

  const handleDrop = async (date: Date, staffId: string) => {
    if (!draggedShift) return;

    const updatedShift = {
      ...draggedShift,
      date: date.toISOString().split('T')[0],
      staffId: staffId,
    };

    await checkConflicts(updatedShift);

    // Update shifts
    setShifts(prev => prev.map(shift =>
      shift.id === draggedShift.id ? { ...shift, ...updatedShift } : shift
    ));
  };

  const getShiftsForDateAndStaff = (date: Date, staffId: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date === dateStr && shift.staffId === staffId);
  };

  const getShiftStatusColor = (status: Shift['status']) => {
    const colors = {
      SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
      IN_PROGRESS: 'bg-green-100 text-green-700 border-green-200',
      COMPLETED: 'bg-gray-100 text-gray-700 border-gray-200',
      MISSED: 'bg-red-100 text-red-700 border-red-200',
      CANCELLED: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[status] || colors.SCHEDULED;
  };

  if (loading) {
    return (
      <div className="card-elevated bg-white rounded-2xl p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-8 gap-4">
            {[...Array(8 * 7)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Schichtplanung</h2>
              <p className="text-sm text-gray-500">
                Woche vom {weekDates[0].toLocaleDateString('de-DE')} - {weekDates[6].toLocaleDateString('de-DE')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddShift(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Schicht hinzufügen</span>
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Vorherige Woche
          </button>

          <div className="text-sm font-medium text-gray-900">
            {selectedDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </div>

          <button
            onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Nächste Woche →
          </button>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="card-elevated bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Schichtkonflikte erkannt</h3>
              {conflicts.map((conflict, index) => (
                <p key={index} className="text-red-700 text-sm mt-1">{conflict.message}</p>
              ))}
            </div>
          </div>
        </div>
      )}

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
          {staff.map((member) => (
            <div key={member.id} className="grid grid-cols-8">
              {/* Staff Info */}
              <div className="p-4 bg-gray-50 border-r border-gray-200 flex items-center space-x-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white',
                  member.position === 'Manager' && 'bg-purple-500',
                  member.position === 'Chef' && 'bg-orange-500',
                  member.position === 'Service' && 'bg-blue-500'
                )}>
                  {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{member.position}</p>
                </div>
              </div>

              {/* Daily Shifts */}
              {weekDates.map((date, dateIndex) => {
                const dayShifts = getShiftsForDateAndStaff(date, member.id);

                return (
                  <div
                    key={dateIndex}
                    className="p-2 min-h-[120px] border-r border-gray-200 last:border-r-0 space-y-1"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(date, member.id)}
                  >
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        draggable
                        onDragStart={() => handleDragStart(shift)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'p-2 rounded-lg border cursor-move transition-all hover:shadow-md',
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
                      </div>
                    ))}

                    {/* Drop Zone */}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-elevated bg-white rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{staff.filter(s => s.isActive).length}</p>
              <p className="text-sm text-gray-500">Aktive Mitarbeiter</p>
            </div>
          </div>
        </div>

        <div className="card-elevated bg-white rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{shifts.length}</p>
              <p className="text-sm text-gray-500">Schichten diese Woche</p>
            </div>
          </div>
        </div>

        <div className="card-elevated bg-white rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{conflicts.length}</p>
              <p className="text-sm text-gray-500">Konflikte erkannt</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
