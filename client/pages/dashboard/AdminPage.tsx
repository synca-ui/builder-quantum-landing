/**
 * Admin Dashboard Page
 * System management, reservations, and SEO overview
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings,
  Users,
  Calendar,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import DashboardLayout from '../../components/dashboard/DashboardLayout';

interface Reservation {
  id: string;
  guestName: string;
  guestEmail?: string;
  guestCount: number;
  reservationTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  table?: {
    number: string;
    name?: string;
  };
}

interface SEOHealth {
  score: number;
  checklist: {
    [key: string]: {
      status: boolean;
      title: string;
      description: string;
    };
  };
  recommendations: string[];
}

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('businessId') || undefined;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [seoHealth, setSeoHealth] = useState<SEOHealth | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [businessId, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Mock reservations data
      const mockReservations: Reservation[] = [
        {
          id: 'res-1',
          guestName: 'Anna Mueller',
          guestEmail: 'anna@example.com',
          guestCount: 4,
          reservationTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          status: 'CONFIRMED',
          table: { number: '5', name: 'Fenster-Tisch' },
        },
        {
          id: 'res-2',
          guestName: 'Marco Schmidt',
          guestCount: 2,
          reservationTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          status: 'PENDING',
          table: { number: '2' },
        },
        {
          id: 'res-3',
          guestName: 'Lisa Weber',
          guestEmail: 'lisa@example.com',
          guestCount: 6,
          reservationTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          status: 'ARRIVED',
          table: { number: '8', name: 'Große Runde' },
        },
        {
          id: 'res-4',
          guestName: 'Tom Fischer',
          guestCount: 3,
          reservationTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          status: 'COMPLETED',
          table: { number: '3' },
        },
      ];

      // Mock SEO health data
      const mockSeoHealth: SEOHealth = {
        score: 75,
        checklist: {
          hasBusinessName: {
            status: true,
            title: 'Business Name Set',
            description: 'Essential for search visibility'
          },
          hasDescription: {
            status: true,
            title: 'Business Description',
            description: 'Helps customers understand your restaurant'
          },
          hasLogo: {
            status: false,
            title: 'Logo Uploaded',
            description: 'Improves brand recognition'
          },
          hasCuisineType: {
            status: true,
            title: 'Cuisine Type Specified',
            description: 'Helps customers find the right food'
          },
          hasOpeningHours: {
            status: false,
            title: 'Opening Hours Set',
            description: 'Critical for local search results'
          },
        },
        recommendations: [
          'Logo hochladen für bessere Markenwahrnehmung',
          'Öffnungszeiten hinzufügen für lokale Suche',
          'Kontaktinformationen vervollständigen',
        ],
      };

      setReservations(mockReservations);
      setSeoHealth(mockSeoHealth);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReservationStatus = async (reservationId: string, newStatus: Reservation['status']) => {
    try {
      setReservations(prev => prev.map(res =>
        res.id === reservationId ? { ...res, status: newStatus } : res
      ));
    } catch (error) {
      console.error('Error updating reservation:', error);
    }
  };

  const getStatusBadge = (status: Reservation['status']) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      CONFIRMED: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
      ARRIVED: { color: 'bg-green-100 text-green-700 border-green-200', icon: Users },
      COMPLETED: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
      NO_SHOW: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle },
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span className={cn('inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border', badge.color)}>
        <Icon className="w-3 h-3" />
        <span>{status}</span>
      </span>
    );
  };

  const filteredReservations = selectedStatus === 'ALL'
    ? reservations
    : reservations.filter(res => res.status === selectedStatus);

  if (loading) {
    return (
      <DashboardLayout businessId={businessId}>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-elevated bg-white rounded-2xl p-8 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout businessId={businessId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin & Verwaltung</h1>
            <p className="text-gray-600 mt-2">
              Systemverwaltung, Reservierungen und SEO-Übersicht
            </p>
          </div>
        </div>

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
                      <h3 className="font-semibold text-gray-900">Reservierungen</h3>
                      <p className="text-sm text-gray-500">Live-Übersicht aller Buchungen</p>
                    </div>
                  </div>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="ALL">Alle Status</option>
                    <option value="PENDING">Ausstehend</option>
                    <option value="CONFIRMED">Bestätigt</option>
                    <option value="ARRIVED">Angekommen</option>
                    <option value="COMPLETED">Abgeschlossen</option>
                  </select>
                </div>

                {/* Status Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { status: 'PENDING', count: reservations.filter(r => r.status === 'PENDING').length, color: 'text-yellow-600' },
                    { status: 'CONFIRMED', count: reservations.filter(r => r.status === 'CONFIRMED').length, color: 'text-blue-600' },
                    { status: 'ARRIVED', count: reservations.filter(r => r.status === 'ARRIVED').length, color: 'text-green-600' },
                    { status: 'COMPLETED', count: reservations.filter(r => r.status === 'COMPLETED').length, color: 'text-gray-600' },
                  ].map(item => (
                    <div key={item.status} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className={cn('text-2xl font-bold', item.color)}>{item.count}</div>
                      <div className="text-xs text-gray-600">{item.status}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reservations List */}
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {filteredReservations.map(reservation => (
                  <div key={reservation.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{reservation.guestName}</h4>
                          {getStatusBadge(reservation.status)}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{reservation.guestCount} Personen</span>
                          <span>
                            {new Date(reservation.reservationTime).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {reservation.table && (
                            <span>Tisch {reservation.table.number}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {reservation.status === 'PENDING' && (
                          <button
                            onClick={() => updateReservationStatus(reservation.id, 'CONFIRMED')}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Bestätigen
                          </button>
                        )}

                        {reservation.status === 'CONFIRMED' && (
                          <button
                            onClick={() => updateReservationStatus(reservation.id, 'ARRIVED')}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Angekommen
                          </button>
                        )}

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

          {/* SEO Health */}
          <div className="xl:col-span-1 space-y-6">
            <div className="card-elevated bg-white rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">SEO-Gesundheit</h3>
                  <p className="text-sm text-gray-500">Suchmaschinen-Optimierung</p>
                </div>
              </div>

              {seoHealth && (
                <>
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
                    <p className="text-sm text-gray-600">SEO Score</p>
                  </div>

                  {/* SEO Checklist */}
                  <div className="space-y-3 mb-6">
                    {Object.entries(seoHealth.checklist).map(([key, item]) => (
                      <div key={key} className="flex items-start space-x-3">
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
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {seoHealth.recommendations.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">Empfehlungen</h4>
                      <ul className="space-y-1">
                        {seoHealth.recommendations.map((rec, index) => (
                          <li key={index} className="text-xs text-gray-600 flex items-start space-x-2">
                            <span className="text-teal-500 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* System Health */}
            <div className="card-elevated bg-white rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">System-Status</h3>
                  <p className="text-sm text-gray-500">Überwachung & Gesundheit</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Datenbank', status: 'healthy', message: 'Verbindung aktiv' },
                  { label: 'API-Endpunkte', status: 'healthy', message: 'Alle Services laufen' },
                  { label: 'QR-Codes', status: 'healthy', message: '8 QR-Codes aktiv' },
                  { label: 'Reservierungssystem', status: 'warning', message: 'Maintenance geplant' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        item.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                      )}></div>
                      <span className="text-sm font-medium text-gray-900">{item.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{item.message}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>System läuft stabil</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
