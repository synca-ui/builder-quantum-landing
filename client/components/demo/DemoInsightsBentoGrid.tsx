/**
 * Demo Insights Bento Grid Component
 * Public demo version with realistic mock data
 */

import React, { useEffect, useState } from 'react';
import {
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  QrCode,
  Calendar,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  gradient: string;
  description?: string;
  className?: string;
}

interface DemoInsightData {
  revenue: { current: number; previous: number; change: number };
  orders: { current: number; previous: number; change: number };
  visitors: { current: number; previous: number; change: number };
  qrScans: { current: number; previous: number; change: number };
  reservations: { current: number; total: number };
  activeTables: number;
}

function MetricCard({ title, value, change, icon: Icon, gradient, description, className }: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className={cn(
      'card-elevated bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          `bg-gradient-to-r ${gradient}`
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>

        {change !== undefined && (
          <div className="flex items-center space-x-2">
            <div className={cn(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              isPositive && 'bg-emerald-100 text-emerald-700',
              isNegative && 'bg-red-100 text-red-700',
              change === 0 && 'bg-gray-100 text-gray-600'
            )}>
              {isPositive && <ArrowUpRight className="w-3 h-3" />}
              {isNegative && <ArrowDownRight className="w-3 h-3" />}
              <span>
                {change > 0 ? '+' : ''}{Math.abs(change).toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-gray-500">vs. gestern</span>
          </div>
        )}

        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

export default function DemoInsightsBentoGrid() {
  const [data, setData] = useState<DemoInsightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API loading with realistic demo data
    const timer = setTimeout(() => {
      setData({
        revenue: { current: 1247, previous: 1089, change: 14.5 },
        orders: { current: 34, previous: 28, change: 21.4 },
        visitors: { current: 87, previous: 72, change: 20.8 },
        qrScans: { current: 52, previous: 41, change: 26.8 },
        reservations: { current: 12, total: 18 },
        activeTables: 5,
      });
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card-elevated bg-white rounded-2xl p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200"></div>
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Demo Notice */}
      <div className="card-elevated bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Demo-Analytics Dashboard</h3>
            <p className="text-blue-700 text-sm">
              Diese Daten sind Beispieldaten. In der echten Version siehst du die Live-Metriken deines Restaurants.
            </p>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Umsatz Heute"
          value={`€${data.revenue.current}`}
          change={data.revenue.change}
          icon={DollarSign}
          gradient="from-emerald-500 to-emerald-600"
          className="md:col-span-1"
        />

        <MetricCard
          title="Bestellungen"
          value={data.orders.current}
          change={data.orders.change}
          icon={ShoppingBag}
          gradient="from-blue-500 to-blue-600"
          className="md:col-span-1"
        />

        <MetricCard
          title="Besucher"
          value={data.visitors.current}
          change={data.visitors.change}
          icon={Users}
          gradient="from-purple-500 to-purple-600"
          className="md:col-span-1"
        />

        <MetricCard
          title="QR Scans"
          value={data.qrScans.current}
          change={data.qrScans.change}
          icon={QrCode}
          gradient="from-teal-500 to-teal-600"
          className="md:col-span-1"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Reservierungen"
          value={`${data.reservations.current} / ${data.reservations.total}`}
          icon={Calendar}
          gradient="from-orange-500 to-orange-600"
          description="Heute bestätigte Reservierungen"
          className="md:col-span-1"
        />

        <MetricCard
          title="Belegte Tische"
          value={data.activeTables}
          icon={MapPin}
          gradient="from-pink-500 to-pink-600"
          description="Live-Status aus dem Lageplan"
          className="md:col-span-1"
        />
      </div>

      {/* Demo Features Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-elevated bg-gradient-to-r from-teal-50 to-green-50 border border-teal-100 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">Echtzeit-Umsatz Tracking</h4>
              <p className="text-sm text-gray-600 mb-3">
                Verfolge deinen Umsatz live mit detaillierten Aufschlüsselungen nach Zahlungsarten, Tageszeiten und beliebten Gerichten.
              </p>
              <div className="flex items-center space-x-2 text-teal-600 text-sm font-medium">
                <span>✓ Live-Updates alle 5 Minuten</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-elevated bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">QR-Code Analytics</h4>
              <p className="text-sm text-gray-600 mb-3">
                Analysiere, wie viele Gäste über deine QR-Codes bestellen und optimiere die Platzierung für maximalen Erfolg.
              </p>
              <div className="flex items-center space-x-2 text-purple-600 text-sm font-medium">
                <span>✓ Tisch-spezifische QR-Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Demo Status */}
      <div className="card-elevated bg-gradient-to-r from-teal-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Live Demo Dashboard</h3>
            <p className="text-white/80 text-sm">
              Diese Demo zeigt dir alle Funktionen, die in der echten Version verfügbar sind •
              Simulierte Echtzeitdaten • Letzte Aktualisierung: {new Date().toLocaleTimeString('de-DE')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Demo Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
