import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Employee {
  id: string;
  name: string;
  position: string;
  avatarUrl?: string;
}

interface Shift {
  id: string;
  employeeId: string;
  employee: Employee;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  status: string;
}

const POSITIONS = [
  { value: 'server', label: 'Server', color: '#0d9488' },
  { value: 'chef', label: 'Koch', color: '#f59e0b' },
  { value: 'bartender', label: 'Barkeeper', color: '#7c3aed' },
  { value: 'host', label: 'Host', color: '#ef4444' },
  { value: 'manager', label: 'Manager', color: '#3b82f6' },
];

export default function StaffPage() {
  const { getToken } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showAddShift, setShowAddShift] = useState(false);
  const [draggedShift, setDraggedShift] = useState<string | null>(null);

  // TODO: Get businessId from context
  const businessId = 'demo-business-id';

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Load employees
      const empRes = await fetch(
        `/api/dashboard/staff/employees?businessId=${businessId}`,
        { headers }
      );
      const empData = await empRes.json();
      if (empData.success) setEmployees(empData.data);

      // Load shifts for current period
      const { startDate, endDate } = getDateRange();
      const shiftsRes = await fetch(
        `/api/dashboard/staff/shifts?businessId=${businessId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { headers }
      );
      const shiftsData = await shiftsRes.json();
      if (shiftsData.success) setShifts(shiftsData.data);
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    if (viewMode === 'week') {
      // Get current week (Monday to Sunday)
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return { startDate: start, endDate: end };
    } else {
      // Get current month
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
  };

  const getWeekDays = () => {
    const { startDate } = getDateRange();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'prev' ? -7 : 7));
    setCurrentDate(newDate);
  };

  const getShiftsForDay = (date: Date, employeeId?: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(
      (shift) =>
        shift.date.startsWith(dateStr) &&
        (!employeeId || shift.employeeId === employeeId)
    );
  };

  const handleDragStart = (shiftId: string) => {
    setDraggedShift(shiftId);
  };

  const handleDrop = async (targetDate: Date, targetEmployeeId: string) => {
    if (!draggedShift) return;

    try {
      const token = await getToken();
      const shift = shifts.find((s) => s.id === draggedShift);
      if (!shift) return;

      const response = await fetch(`/api/dashboard/staff/shifts/${draggedShift}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          employeeId: targetEmployeeId,
          date: targetDate.toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setShifts((prev) =>
          prev.map((s) => (s.id === draggedShift ? result.data : s))
        );
      } else if (response.status === 409) {
        // Conflict detected
        alert(`Konflikt: ${result.error}\n\n${JSON.stringify(result.conflicts, null, 2)}`);
      }
    } catch (error) {
      console.error('Error moving shift:', error);
    } finally {
      setDraggedShift(null);
    }
  };

  const createShift = async (data: any) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/dashboard/staff/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          businessId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShifts((prev) => [...prev, result.data]);
        setShowAddShift(false);
      } else if (response.status === 409) {
        alert(`Konflikt erkannt: ${result.error}`);
      } else if (response.status === 400) {
        alert(result.message || result.error);
      }
    } catch (error) {
      console.error('Error creating shift:', error);
    }
  };

  const weekDays = getWeekDays();
  const weekDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-purple-500 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Schichtplan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Schichtplanung
          </h2>
          <p className="text-gray-600 mt-1">
            {employees.length} Mitarbeiter · {shifts.length} Schichten diese Woche
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={showAddShift} onOpenChange={setShowAddShift}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-500 to-purple-500">
                <Plus className="w-4 h-4 mr-2" />
                Schicht hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Schicht erstellen</DialogTitle>
              </DialogHeader>
              <AddShiftForm
                employees={employees}
                onSubmit={createShift}
                onCancel={() => setShowAddShift(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">
                  {weekDays[0].toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'long',
                  })}{' '}
                  -{' '}
                  {weekDays[6].toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-sm text-gray-500">KW {getWeekNumber(weekDays[0])}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Heute
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
              <div className="p-3 font-semibold text-sm text-gray-600 border-r border-gray-200">
                Mitarbeiter
              </div>
              {weekDays.map((day, i) => (
                <div
                  key={day.toISOString()}
                  className="p-3 text-center border-r last:border-r-0 border-gray-200"
                >
                  <div className="font-semibold text-sm text-gray-900">
                    {weekDayNames[i]}
                  </div>
                  <div className="text-xs text-gray-500">
                    {day.getDate()}.{day.getMonth() + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Employee Rows */}
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-8 border-b last:border-b-0 border-gray-200"
              >
                {/* Employee Info */}
                <div className="p-3 border-r border-gray-200 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      {employee.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {employee.name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {employee.position}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shift Cells */}
                {weekDays.map((day) => {
                  const dayShifts = getShiftsForDay(day, employee.id);

                  return (
                    <div
                      key={`${employee.id}-${day.toISOString()}`}
                      className="p-2 border-r last:border-r-0 border-gray-200 min-h-[80px] bg-white"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(day, employee.id)}
                    >
                      <div className="space-y-1">
                        {dayShifts.map((shift) => {
                          const position = POSITIONS.find(
                            (p) => p.value === shift.position
                          );
                          return (
                            <div
                              key={shift.id}
                              draggable
                              onDragStart={() => handleDragStart(shift.id)}
                              className="p-2 rounded-lg text-xs cursor-move hover:shadow-md transition-shadow"
                              style={{
                                backgroundColor: position?.color + '20',
                                borderLeft: `3px solid ${position?.color}`,
                              }}
                            >
                              <div className="flex items-center gap-1 text-gray-700 font-medium">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {shift.startTime} - {shift.endTime}
                                </span>
                              </div>
                              <div className="text-gray-600 mt-0.5">
                                {position?.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Position Legende</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {POSITIONS.map((position) => (
              <div key={position.value} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: position.color }}
                />
                <span className="text-sm text-gray-700">{position.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddShiftForm({
  employees,
  onSubmit,
  onCancel,
}: {
  employees: Employee[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    position: 'server',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Mitarbeiter</Label>
        <Select
          value={formData.employeeId}
          onValueChange={(value) =>
            setFormData({ ...formData, employeeId: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Wähle Mitarbeiter" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name} - {emp.position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Datum</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Von</Label>
          <Input
            type="time"
            value={formData.startTime}
            onChange={(e) =>
              setFormData({ ...formData, startTime: e.target.value })
            }
          />
        </div>
        <div>
          <Label>Bis</Label>
          <Input
            type="time"
            value={formData.endTime}
            onChange={(e) =>
              setFormData({ ...formData, endTime: e.target.value })
            }
          />
        </div>
      </div>

      <div>
        <Label>Position</Label>
        <Select
          value={formData.position}
          onValueChange={(value) =>
            setFormData({ ...formData, position: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((pos) => (
              <SelectItem key={pos.value} value={pos.value}>
                {pos.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Schicht erstellen
        </Button>
      </div>
    </form>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
