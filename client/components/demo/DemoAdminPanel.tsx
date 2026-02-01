/**
 * Demo Admin Panel Component - Enterprise SaaS Grade
 * Advanced restaurant management dashboard with analytics, settings, and system monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  Lock,
  Mail,
  Smartphone,
  CreditCard,
  Zap,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Server,
  Activity,
  FileText,
  Bell,
  Search,
  Filter,
  Calendar,
  DollarSign,
  UserCheck,
  MapPin,
  Star,
  Award,
  Target,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLogin: string;
  avatar: string;
  permissions: string[];
}

interface SystemMetric {
  id: string;
  name: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
}

interface SecurityEvent {
  id: string;
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PERMISSION_CHANGE' | 'DATA_EXPORT';
  user: string;
  timestamp: string;
  ipAddress: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export default function DemoAdminPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'security' | 'analytics' | 'settings'>('overview');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [systemHealth, setSystemHealth] = useState(98);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Professional demo data
  const demoUsers: User[] = [
    {
      id: '1',
      name: 'Max Mustermann',
      email: 'max@restaurant-demo.de',
      role: 'OWNER',
      status: 'ACTIVE',
      lastLogin: '2 Minuten',
      avatar: 'MM',
      permissions: ['FULL_ACCESS', 'BILLING', 'USER_MANAGEMENT', 'SYSTEM_CONFIG']
    },
    {
      id: '2',
      name: 'Sarah Schmidt',
      email: 'sarah@restaurant-demo.de',
      role: 'MANAGER',
      status: 'ACTIVE',
      lastLogin: '1 Stunde',
      avatar: 'SS',
      permissions: ['DASHBOARD', 'STAFF_MANAGEMENT', 'ORDERS', 'ANALYTICS']
    },
    {
      id: '3',
      name: 'Tom Weber',
      email: 'tom@restaurant-demo.de',
      role: 'STAFF',
      status: 'INACTIVE',
      lastLogin: '3 Tage',
      avatar: 'TW',
      permissions: ['DASHBOARD', 'ORDERS']
    }
  ];

  const systemMetrics: SystemMetric[] = [
    {
      id: 'uptime',
      name: 'System Uptime',
      value: '99.9%',
      change: '+0.1%',
      trend: 'up',
      status: 'healthy'
    },
    {
      id: 'response',
      name: 'Response Time',
      value: '89ms',
      change: '-12ms',
      trend: 'up',
      status: 'healthy'
    },
    {
      id: 'storage',
      name: 'Storage Usage',
      value: '67%',
      change: '+5%',
      trend: 'up',
      status: 'warning'
    },
    {
      id: 'requests',
      name: 'API Requests/min',
      value: '1,247',
      change: '+23%',
      trend: 'up',
      status: 'healthy'
    }
  ];

  const demoSecurityEvents: SecurityEvent[] = [
    {
      id: '1',
      type: 'LOGIN_SUCCESS',
      user: 'Max Mustermann',
      timestamp: '2 Minuten',
      ipAddress: '192.168.1.100',
      description: 'Erfolgreiche Anmeldung über Web-Interface',
      severity: 'low'
    },
    {
      id: '2',
      type: 'PERMISSION_CHANGE',
      user: 'Sarah Schmidt',
      timestamp: '1 Stunde',
      ipAddress: '192.168.1.105',
      description: 'Berechtigung für Analytics hinzugefügt',
      severity: 'medium'
    },
    {
      id: '3',
      type: 'LOGIN_FAILED',
      user: 'unknown',
      timestamp: '2 Stunden',
      ipAddress: '203.45.67.89',
      description: 'Fehlgeschlagener Anmeldeversuch mit ungültigen Daten',
      severity: 'medium'
    }
  ];

  useEffect(() => {
    setUsers(demoUsers);
    setSecurityEvents(demoSecurityEvents);
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-700 border-green-300',
      'INACTIVE': 'bg-gray-100 text-gray-700 border-gray-300',
      'SUSPENDED': 'bg-red-100 text-red-700 border-red-300',
      'healthy': 'text-green-600',
      'warning': 'text-yellow-600',
      'critical': 'text-red-600'
    };
    return colors[status as keyof typeof colors] || colors.INACTIVE;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'low': 'bg-blue-100 text-blue-700 border-blue-300',
      'medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'high': 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return Shield;
      case 'MANAGER': return UserCheck;
      case 'STAFF': return Users;
      default: return Users;
    }
  };
  const [showDemo, setShowDemo] = useState(true);

  const demoReservations = [
    { id: '1', guestName: 'Anna Mueller', guestCount: 4, time: '19:00', status: 'CONFIRMED', table: '5' },
    { id: '2', guestName: 'Marco Schmidt', guestCount: 2, time: '20:30', status: 'PENDING', table: '2' },
    { id: '3', guestName: 'Lisa Weber', guestCount: 6, time: '18:30', status: 'ARRIVED', table: '8' },
    { id: '4', guestName: 'Tom Fischer', guestCount: 3, time: '21:00', status: 'COMPLETED', table: '3' },
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      CONFIRMED: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
      ARRIVED: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
      COMPLETED: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span className={cn('inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border', badge.color)}>
        <Icon className="w-3 h-3" />
        <span>{status}</span>
      </span>
    );
  };

  const seoHealth = {
    score: 85,
    checklist: [
      { title: 'Business Name', status: true },
      { title: 'Logo Upload', status: false },
      { title: 'Opening Hours', status: true },
      { title: 'Contact Info', status: false },
    ]
  };

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      {showDemo && (
        <div className="card-elevated bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Demo Admin & Verwaltung</h3>
                <p className="text-gray-600 text-sm mb-3">
                  Teste Reservierungsmanagement, SEO-Überwachung und Systemstatus mit realistischen Demo-Daten.
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>✓ Reservierungs-Workflow</span>
                  <span>✓ SEO-Gesundheit</span>
                  <span>✓ System-Monitoring</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDemo(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Reservations */}
        <div className="xl:col-span-2">
          <div className="card-elevated bg-white rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Reservierungen (Demo)</h3>
                    <p className="text-sm text-gray-500">Live-Übersicht aller Buchungen</p>
                  </div>
                </div>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="ALL">Alle Status</option>
                  <option value="PENDING">Ausstehend</option>
                  <option value="CONFIRMED">Bestätigt</option>
                  <option value="ARRIVED">Angekommen</option>
                </select>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { status: 'PENDING', count: 1, color: 'text-yellow-600' },
                  { status: 'CONFIRMED', count: 1, color: 'text-blue-600' },
                  { status: 'ARRIVED', count: 1, color: 'text-green-600' },
                  { status: 'COMPLETED', count: 1, color: 'text-gray-600' },
                ].map(item => (
                  <div key={item.status} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className={cn('text-2xl font-bold', item.color)}>{item.count}</div>
                    <div className="text-xs text-gray-600">{item.status}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reservations List */}
            <div className="divide-y divide-gray-200">
              {demoReservations.map(reservation => (
                <div key={reservation.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{reservation.guestName}</h4>
                        {getStatusBadge(reservation.status)}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{reservation.guestCount} Personen</span>
                        <span>{reservation.time}</span>
                        <span>Tisch {reservation.table}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
                        Verwalten (Demo)
                      </button>

                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEO Health & System Status */}
        <div className="xl:col-span-1 space-y-6">
          {/* SEO Health */}
          <div className="card-elevated bg-white rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">SEO-Gesundheit (Demo)</h3>
                <p className="text-sm text-gray-500">Suchmaschinen-Optimierung</p>
              </div>
            </div>

            {/* SEO Score */}
            <div className="text-center mb-6">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#059669"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - seoHealth.score / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{seoHealth.score}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">Demo SEO Score</p>
            </div>

            {/* SEO Checklist */}
            <div className="space-y-3 mb-6">
              {seoHealth.checklist.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                    item.status ? 'bg-green-100' : 'bg-gray-100'
                  )}>
                    {item.status ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="card-elevated bg-white rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">System-Status (Demo)</h3>
                <p className="text-sm text-gray-500">Überwachung & Gesundheit</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Demo Datenbank', status: 'healthy', message: 'Verbindung aktiv' },
                { label: 'Demo APIs', status: 'healthy', message: 'Alle Services laufen' },
                { label: 'Demo QR-Codes', status: 'healthy', message: '5 QR-Codes aktiv' },
                { label: 'Demo System', status: 'healthy', message: 'Optimal' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">{item.message}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Demo System läuft stabil</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
