/**
 * Demo Reservations Dashboard Component - Enterprise SaaS Grade
 * Comprehensive reservation management system with live updates and analytics
 */

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Download,
  Plus,
  Eye,
  Edit3,
  MoreHorizontal,
  Star,
  TrendingUp,
  DollarSign,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reservation {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  date: string;
  time: string;
  tableNumber?: string;
  status: 'PENDING' | 'CONFIRMED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  specialRequests?: string;
  createdAt: string;
  estimatedRevenue: number;
  isVip: boolean;
}

interface ReservationStats {
  totalToday: number;
  confirmed: number;
  pending: number;
  arrived: number;
  totalRevenue: number;
  averagePartySize: number;
  peakHour: string;
}

export default function DemoReservationsDashboard() {
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Professional demo reservations data
  const reservations: Reservation[] = [
    {
      id: 'RES-001',
      customerName: 'Maria Schmidt',
      customerEmail: 'maria.schmidt@email.com',
      customerPhone: '+49 176 12345678',
      partySize: 4,
      date: '2026-02-02',
      time: '19:30',
      tableNumber: 'T12',
      status: 'CONFIRMED',
      specialRequests: 'Vegetarische Optionen gewünscht',
      createdAt: '2026-02-01T14:30:00Z',
      estimatedRevenue: 180,
      isVip: false
    },
    {
      id: 'RES-002',
      customerName: 'Thomas Weber',
      customerEmail: 'thomas.weber@email.com',
      customerPhone: '+49 171 98765432',
      partySize: 2,
      date: '2026-02-02',
      time: '20:00',
      tableNumber: 'T08',
      status: 'ARRIVED',
      createdAt: '2026-01-30T16:45:00Z',
      estimatedRevenue: 95,
      isVip: true
    },
    {
      id: 'RES-003',
      customerName: 'Sophie Müller',
      customerEmail: 'sophie.mueller@email.com',
      customerPhone: '+49 152 11223344',
      partySize: 6,
      date: '2026-02-02',
      time: '18:00',
      status: 'PENDING',
      specialRequests: 'Hochzeitstag - besondere Dekoration gewünscht',
      createdAt: '2026-02-02T08:15:00Z',
      estimatedRevenue: 320,
      isVip: false
    },
    {
      id: 'RES-004',
      customerName: 'Alexander Fischer',
      customerEmail: 'alex.fischer@email.com',
      customerPhone: '+49 160 55667788',
      partySize: 3,
      date: '2026-02-02',
      time: '19:00',
      tableNumber: 'T15',
      status: 'CONFIRMED',
      createdAt: '2026-01-28T11:20:00Z',
      estimatedRevenue: 135,
      isVip: false
    },
    {
      id: 'RES-005',
      customerName: 'Julia Bauer',
      customerEmail: 'julia.bauer@email.com',
      customerPhone: '+49 175 99887766',
      partySize: 8,
      date: '2026-02-02',
      time: '17:30',
      status: 'COMPLETED',
      specialRequests: 'Geschäftsdinner - separater Bereich bevorzugt',
      createdAt: '2026-01-25T09:30:00Z',
      estimatedRevenue: 450,
      isVip: true
    }
  ];

  // Statistics calculation
  const stats: ReservationStats = {
    totalToday: reservations.length,
    confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
    pending: reservations.filter(r => r.status === 'PENDING').length,
    arrived: reservations.filter(r => r.status === 'ARRIVED').length,
    totalRevenue: reservations.reduce((sum, r) => sum + r.estimatedRevenue, 0),
    averagePartySize: Math.round(reservations.reduce((sum, r) => sum + r.partySize, 0) / reservations.length * 10) / 10,
    peakHour: '19:30'
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 border-yellow-300 text-yellow-700',
      'CONFIRMED': 'bg-blue-100 border-blue-300 text-blue-700',
      'ARRIVED': 'bg-green-100 border-green-300 text-green-700',
      'COMPLETED': 'bg-purple-100 border-purple-300 text-purple-700',
      'CANCELLED': 'bg-red-100 border-red-300 text-red-700',
      'NO_SHOW': 'bg-gray-100 border-gray-300 text-gray-700'
    };
    return colors[status as keyof typeof colors] || colors.PENDING;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return CheckCircle;
      case 'ARRIVED': return Users;
      case 'PENDING': return Clock;
      case 'COMPLETED': return Star;
      case 'CANCELLED': case 'NO_SHOW': return XCircle;
      default: return AlertCircle;
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesStatus = selectedStatus === 'ALL' || reservation.status === selectedStatus;
    const matchesSearch = reservation.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.customerPhone.includes(searchTerm);
    const matchesDate = reservation.date === selectedDate;

    return matchesStatus && matchesSearch && matchesDate;
  });

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
                <span>Reservierungen Dashboard</span>
                <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs font-bold rounded-full">
                  LIVE
                </div>
              </h1>
              <p className="text-gray-600 mt-1">Vollständige Buchungsverwaltung mit Echtzeit-Updates</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Quick Actions */}
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-md">
              <Plus className="w-4 h-4" />
              <span>Neue Reservierung</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        {[
          {
            title: 'Heute Total',
            value: stats.totalToday,
            change: `${stats.totalToday} Buchungen`,
            icon: Calendar,
            color: 'from-blue-500 to-blue-600'
          },
          {
            title: 'Bestätigt',
            value: stats.confirmed,
            change: `${Math.round((stats.confirmed / stats.totalToday) * 100)}% Quote`,
            icon: CheckCircle,
            color: 'from-green-500 to-green-600'
          },
          {
            title: 'Ausstehend',
            value: stats.pending,
            change: 'Benötigt Bearbeitung',
            icon: Clock,
            color: 'from-yellow-500 to-yellow-600'
          },
          {
            title: 'Angekommen',
            value: stats.arrived,
            change: 'Aktuelle Gäste',
            icon: Users,
            color: 'from-purple-500 to-purple-600'
          },
          {
            title: 'Geschätzter Umsatz',
            value: `€${stats.totalRevenue}`,
            change: 'Nur heute',
            icon: DollarSign,
            color: 'from-emerald-500 to-emerald-600'
          },
          {
            title: 'Ø Personen',
            value: stats.averagePartySize,
            change: `Peak: ${stats.peakHour}`,
            icon: TrendingUp,
            color: 'from-orange-500 to-orange-600'
          }
        ].map((metric, index) => (
          <div key={index} className="card-elevated bg-white rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center shadow-sm', metric.color)}>
                <metric.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                {metric.change}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-600">{metric.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Filters & Search */}
        <div className="xl:col-span-1">
          <div className="card-elevated bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Filter & Suche</h3>
              <Filter className="w-5 h-5 text-blue-600" />
            </div>

            {/* Search */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Suche</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, E-Mail oder Telefon..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">Alle Status</option>
                <option value="PENDING">Ausstehend</option>
                <option value="CONFIRMED">Bestätigt</option>
                <option value="ARRIVED">Angekommen</option>
                <option value="COMPLETED">Abgeschlossen</option>
                <option value="CANCELLED">Storniert</option>
                <option value="NO_SHOW">Nicht erschienen</option>
              </select>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Heute im Überblick</h4>
              {[
                { label: 'Bestätigt', value: stats.confirmed, color: 'bg-green-100 text-green-700' },
                { label: 'Ausstehend', value: stats.pending, color: 'bg-yellow-100 text-yellow-700' },
                { label: 'Angekommen', value: stats.arrived, color: 'bg-purple-100 text-purple-700' }
              ].map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{stat.label}</span>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', stat.color)}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reservations List */}
        <div className="xl:col-span-3">
          <div className="card-elevated bg-white rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <span>Reservierungen ({filteredReservations.length})</span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDate} • Live-Updates aktiviert
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                    <RefreshCw className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredReservations.map((reservation) => {
                const StatusIcon = getStatusIcon(reservation.status);

                return (
                  <div
                    key={reservation.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shadow-sm',
                          reservation.isVip ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gray-100'
                        )}>
                          {reservation.isVip ? (
                            <Star className="w-5 h-5 text-white" />
                          ) : (
                            <StatusIcon className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                            <span>{reservation.customerName}</span>
                            {reservation.isVip && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                VIP
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">{reservation.customerEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium border',
                          getStatusColor(reservation.status)
                        )}>
                          {reservation.status}
                        </div>
                        <button className="p-1 rounded hover:bg-gray-100">
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{reservation.time}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{reservation.partySize} Personen</span>
                      </div>

                      {reservation.tableNumber && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>Tisch {reservation.tableNumber}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>€{reservation.estimatedRevenue} erwartet</span>
                      </div>
                    </div>

                    {reservation.specialRequests && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Besondere Wünsche:</strong> {reservation.specialRequests}
                        </p>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>ID: {reservation.id}</span>
                        <span>•</span>
                        <span>Erstellt: {new Date(reservation.createdAt).toLocaleDateString('de-DE')}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors">
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                        <button className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                          <Edit3 className="w-3 h-3" />
                          <span>Bearbeiten</span>
                        </button>
                        <button className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">
                          <Phone className="w-3 h-3" />
                          <span>Anrufen</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
