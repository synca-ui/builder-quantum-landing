/**
 * Demo Staff Calendar Component - Enterprise SaaS Grade
 * Advanced staff scheduling with AI optimization, conflict resolution, and performance analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Plus,
  Filter,
  Download,
  BarChart3,
  TrendingUp,
  Zap,
  Target,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone?: string;
  hourlyRate: number;
  isActive: boolean;
  avatar: string;
  skills: string[];
  performance: number;
  reliability: number;
}

interface Shift {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
  shiftType: 'REGULAR' | 'OVERTIME' | 'HOLIDAY';
  actualStart?: string;
  actualEnd?: string;
  notes?: string;
}

interface Conflict {
  id: string;
  type: 'overlap' | 'understaffed' | 'overtime' | 'skills_gap';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedShifts: string[];
  suggestion?: string;
}

export default function DemoStaffCalendar() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  // Enterprise-grade demo data
  const demoStaff: StaffMember[] = [
    {
      id: '1',
      firstName: 'Sarah',
      lastName: 'Chen',
      position: 'Kitchen Manager',
      email: 'sarah.chen@demo.maitr.de',
      phone: '+49 151 2345 6789',
      hourlyRate: 28.50,
      isActive: true,
      avatar: 'SC',
      skills: ['Leadership', 'Inventory Management', 'Food Safety', 'Training'],
      performance: 94,
      reliability: 98
    },
    {
      id: '2',
      firstName: 'Marcus',
      lastName: 'Weber',
      position: 'Head Server',
      email: 'marcus.weber@demo.maitr.de',
      phone: '+49 151 9876 5432',
      hourlyRate: 19.75,
      isActive: true,
      avatar: 'MW',
      skills: ['Customer Service', 'POS Systems', 'Wine Service', 'Team Coordination'],
      performance: 91,
      reliability: 96
    },
    {
      id: '3',
      firstName: 'Elena',
      lastName: 'Rodriguez',
      position: 'Sous Chef',
      email: 'elena.rodriguez@demo.maitr.de',
      hourlyRate: 24.00,
      isActive: true,
      avatar: 'ER',
      skills: ['Menu Development', 'Prep Management', 'Quality Control'],
      performance: 89,
      reliability: 93
    },
    {
      id: '4',
      firstName: 'David',
      lastName: 'Kim',
      position: 'Server',
      email: 'david.kim@demo.maitr.de',
      hourlyRate: 16.50,
      isActive: true,
      avatar: 'DK',
      skills: ['Customer Service', 'Multitasking', 'Order Management'],
      performance: 87,
      reliability: 91
    },
    {
      id: '5',
      firstName: 'Anna',
      lastName: 'Schneider',
      position: 'Barista',
      email: 'anna.schneider@demo.maitr.de',
      hourlyRate: 15.25,
      isActive: true,
      avatar: 'AS',
      skills: ['Coffee Preparation', 'Customer Service', 'Cash Handling'],
      performance: 92,
      reliability: 95
    }
  ];

  // Intelligent shift scheduling
  const demoShifts: Shift[] = [
    // Today's shifts
    {
      id: 'sh1',
      staffId: '1',
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '16:30',
      position: 'Kitchen Manager',
      status: 'IN_PROGRESS',
      shiftType: 'REGULAR',
      actualStart: '07:55',
      notes: 'Morning prep oversight'
    },
    {
      id: 'sh2',
      staffId: '2',
      date: new Date().toISOString().split('T')[0],
      startTime: '11:00',
      endTime: '20:00',
      position: 'Head Server',
      status: 'SCHEDULED',
      shiftType: 'REGULAR'
    },
    {
      id: 'sh3',
      staffId: '5',
      date: new Date().toISOString().split('T')[0],
      startTime: '07:00',
      endTime: '15:00',
      position: 'Barista',
      status: 'IN_PROGRESS',
      shiftType: 'REGULAR',
      actualStart: '07:00'
    }
  ];

  // AI-powered conflict detection
  useEffect(() => {
    const aiConflicts: Conflict[] = [
      {
        id: 'c1',
        type: 'understaffed',
        message: 'Sonntag 14-18 Uhr: Nur 1 Server eingeplant',
        severity: 'medium',
        affectedShifts: ['sh4'],
        suggestion: 'David Kim als Zusatzkraft einteilen (+€66 Kosten)'
      },
      {
        id: 'c2',
        type: 'skills_gap',
        message: 'Donnerstag: Keine Barista-Expertise während Stoßzeit',
        severity: 'low',
        affectedShifts: ['sh7'],
        suggestion: 'Anna Schneider Schicht um 1h verlängern'
      }
    ];
    setConflicts(aiConflicts);
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      'SCHEDULED': 'bg-blue-100 text-blue-700 border-blue-300',
      'IN_PROGRESS': 'bg-green-100 text-green-700 border-green-300',
      'COMPLETED': 'bg-gray-100 text-gray-700 border-gray-300',
      'MISSED': 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[status as keyof typeof colors] || colors.SCHEDULED;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'low': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'medium': 'bg-orange-50 border-orange-200 text-orange-800',
      'high': 'bg-red-50 border-red-200 text-red-800',
      'critical': 'bg-red-100 border-red-300 text-red-900'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <span>Team Management</span>
                <div className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                  AI-POWERED
                </div>
              </h1>
              <p className="text-gray-600 mt-1">Intelligente Personalplanung mit Echtzeit-Optimierung</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              {[
                { key: 'week', label: 'Woche' },
                { key: 'month', label: 'Monat' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as 'week' | 'month')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    viewMode === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Smart Action Buttons */}
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-md">
              <Zap className="w-4 h-4" />
              <span>KI-Optimierung</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          {
            title: 'Team Aktiv',
            value: demoStaff.filter(s => s.isActive).length,
            total: demoStaff.length,
            change: '+1 diese Woche',
            icon: Users,
            color: 'from-blue-500 to-blue-600',
            trend: 'positive'
          },
          {
            title: 'Laufende Schichten',
            value: demoShifts.filter(s => s.status === 'IN_PROGRESS').length,
            total: 8,
            change: 'Optimal besetzt',
            icon: Clock,
            color: 'from-green-500 to-green-600',
            trend: 'neutral'
          },
          {
            title: 'Performance Ø',
            value: Math.round(demoStaff.reduce((a, s) => a + s.performance, 0) / demoStaff.length) + '%',
            total: null,
            change: '+3% vs. Vormonat',
            icon: TrendingUp,
            color: 'from-purple-500 to-purple-600',
            trend: 'positive'
          },
          {
            title: 'Personalkosten',
            value: '€1,247',
            total: '€1,400 Budget',
            change: '11% unter Budget',
            icon: BarChart3,
            color: 'from-emerald-500 to-emerald-600',
            trend: 'positive'
          },
          {
            title: 'Konflikte',
            value: conflicts.length,
            total: conflicts.length + 7 + ' gelöst',
            change: conflicts.length === 0 ? 'Alle gelöst!' : 'KI-Lösungen bereit',
            icon: AlertTriangle,
            color: conflicts.length > 0 ? 'from-orange-500 to-orange-600' : 'from-green-500 to-green-600',
            trend: conflicts.length === 0 ? 'positive' : 'warning'
          }
        ].map((metric, index) => (
          <div key={index} className="card-elevated bg-white rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center shadow-sm', metric.color)}>
                <metric.icon className="w-5 h-5 text-white" />
              </div>
              <span className={cn(
                'text-xs font-medium px-2 py-1 rounded-full',
                metric.trend === 'positive' ? 'bg-green-100 text-green-700' :
                metric.trend === 'warning' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              )}>
                {metric.change}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                {metric.total && (
                  <p className="text-sm text-gray-500">/ {metric.total}</p>
                )}
              </div>
              <p className="text-sm text-gray-600">{metric.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Conflict Resolution */}
      {conflicts.length > 0 && (
        <div className="card-elevated bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 border border-orange-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <h3 className="font-semibold text-gray-900">KI-Optimierungsvorschläge</h3>
                <div className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  {conflicts.length} Verbesserungen gefunden
                </div>
              </div>
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className={cn('rounded-lg p-4 border', getSeverityColor(conflict.severity))}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">{conflict.message}</span>
                          <span className="px-2 py-0.5 bg-white/70 rounded text-xs font-medium">
                            {conflict.severity.toUpperCase()}
                          </span>
                        </div>
                        {conflict.suggestion && (
                          <p className="text-sm mt-2 pl-6">
                            <strong>KI-Empfehlung:</strong> {conflict.suggestion}
                          </p>
                        )}
                      </div>
                      <button className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                        Anwenden
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Team Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Team Overview Panel */}
        <div className="xl:col-span-1">
          <div className="card-elevated bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Team Performance</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Alle Details
              </button>
            </div>

            <div className="space-y-4">
              {demoStaff.map((member) => (
                <div key={member.id} className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
                        <span className="text-white font-medium">{member.avatar}</span>
                      </div>
                      <div className={cn(
                        'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white',
                        member.isActive ? 'bg-green-400' : 'bg-gray-400'
                      )}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <div className={cn('text-sm font-medium', getPerformanceColor(member.performance))}>
                          {member.performance}%
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{member.position}</p>
                      <p className="text-xs text-gray-500">€{member.hourlyRate}/h</p>
                    </div>
                  </div>

                  {/* Performance Bars */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Performance</span>
                      <span>{member.performance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${member.performance}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Zuverlässigkeit</span>
                      <span>{member.reliability}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${member.reliability}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Skills Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {member.skills.slice(0, 2).map((skill, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 2 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                        +{member.skills.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Intelligent Schedule Grid */}
        <div className="xl:col-span-3">
          <div className="card-elevated bg-white rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <span>Intelligente Wochenplanung</span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">KW 5, 2026 • Optimiert für 94% Effizienz</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                    <span className="text-gray-600">Aktiv</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                    <span className="text-gray-600">Geplant</span>
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    89% Optimal besetzt
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Team Member</th>
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => (
                      <th key={day} className={cn(
                        'px-4 py-4 text-center text-sm font-medium border-l border-gray-200',
                        index === new Date().getDay() - 1 ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                      )}>
                        <div>{day}</div>
                        <div className="text-xs text-gray-500 mt-1 font-normal">
                          {new Date(Date.now() + index * 24 * 60 * 60 * 1000).getDate()}.{new Date(Date.now() + index * 24 * 60 * 60 * 1000).getMonth() + 1}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demoStaff.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">{member.avatar}</span>
                            </div>
                            <div className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                              member.isActive ? 'bg-green-400' : 'bg-gray-400'
                            )}></div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-gray-600">{member.position}</p>
                          </div>
                        </div>
                      </td>

                      {/* Weekly Schedule Cells */}
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const dayShifts = demoShifts.filter(shift =>
                          shift.staffId === member.id &&
                          shift.date === new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        );

                        return (
                          <td key={dayIndex} className="px-2 py-4 border-l border-gray-200">
                            <div className="min-h-[60px] space-y-1">
                              {dayShifts.length > 0 ? (
                                dayShifts.map((shift) => (
                                  <div
                                    key={shift.id}
                                    className={cn(
                                      'rounded-lg p-2 text-xs cursor-pointer transition-all hover:shadow-md',
                                      getStatusColor(shift.status),
                                      'border shadow-sm'
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">
                                        {shift.startTime}-{shift.endTime}
                                      </span>
                                      {shift.shiftType !== 'REGULAR' && (
                                        <div className={cn(
                                          'w-2 h-2 rounded-full',
                                          shift.shiftType === 'OVERTIME' ? 'bg-orange-400' : 'bg-purple-400'
                                        )}></div>
                                      )}
                                    </div>

                                    <div className="flex items-center space-x-1">
                                      {shift.status === 'IN_PROGRESS' && (
                                        <div className="flex items-center space-x-1">
                                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                          <span className="text-green-700 font-medium">Live</span>
                                        </div>
                                      )}

                                      {shift.actualStart && (
                                        <div className="text-green-600 text-xs">
                                          ✓ {shift.actualStart}
                                        </div>
                                      )}
                                    </div>

                                    {shift.notes && (
                                      <p className="text-gray-700 mt-1 text-xs truncate" title={shift.notes}>
                                        {shift.notes}
                                      </p>
                                    )}
                                  </div>
                                ))
                              ) : (
                                // Smart scheduling suggestions
                                <button className="w-full h-full min-h-[50px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all group">
                                  <Plus className="w-4 h-4 mb-1" />
                                  <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                    Schicht
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Analytics */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Performance Intelligence</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">Intelligente Teamanalyse und Optimierungsvorschläge</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Vollständiger Bericht
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              title: 'Team Effizienz',
              value: '94%',
              trend: '+6%',
              subtitle: 'vs. letzter Monat',
              icon: Target,
              color: 'text-green-600',
              bg: 'bg-green-50'
            },
            {
              title: 'Pünktlichkeit',
              value: '97%',
              trend: '+2%',
              subtitle: 'Durchschnittswert',
              icon: CheckCircle,
              color: 'text-blue-600',
              bg: 'bg-blue-50'
            },
            {
              title: 'Kostenkontrolle',
              value: '€18.4k',
              trend: '-5%',
              subtitle: 'Monatliche Einsparung',
              icon: TrendingUp,
              color: 'text-purple-600',
              bg: 'bg-purple-50'
            },
            {
              title: 'Mitarbeiterzufriedenheit',
              value: '4.8/5',
              trend: '+0.3',
              subtitle: 'Bewertung',
              icon: Award,
              color: 'text-orange-600',
              bg: 'bg-orange-50'
            }
          ].map((metric, index) => (
            <div key={index} className={cn('rounded-xl p-4 border', metric.bg)}>
              <div className="flex items-center justify-between mb-3">
                <metric.icon className={cn('w-6 h-6', metric.color)} />
                <span className={cn(
                  'text-sm font-medium px-2 py-1 rounded-full',
                  metric.trend.startsWith('+') ? 'bg-green-100 text-green-700' :
                  metric.trend.startsWith('-') ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                )}>
                  {metric.trend}
                </span>
              </div>
              <div className="space-y-1">
                <p className={cn('text-2xl font-bold', metric.color)}>{metric.value}</p>
                <p className="text-sm text-gray-600">{metric.title}</p>
                <p className="text-xs text-gray-500">{metric.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
