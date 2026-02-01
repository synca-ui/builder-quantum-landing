/**
 * Insights Bento Grid Component
 * Real-time analytics dashboard with beautiful card layouts
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

interface InsightData {
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

export default function InsightsBentoGrid({ businessId }: { businessId?: string }) {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();

    // Set up real-time updates every 5 minutes
    const interval = setInterval(fetchInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [businessId]);

  const fetchInsights = async () => {
    try {
      setError(null);

      // Use demo endpoint if no businessId, otherwise use authenticated endpoint
      const endpoint = businessId
        ? `/api/dashboard/insights/overview?businessId=${businessId}`
        : '/api/demo/dashboard/insights/overview';

      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch insights');
      }
    } catch (err) {
      setError('Network error - using offline data');
      console.error('Error fetching insights:', err);

      // Fallback to mock data
      setData({
        revenue: { current: 750, previous: 680, change: 10.3 },
        orders: { current: 23, previous: 20, change: 15.0 },
        visitors: { current: 45, previous: 38, change: 18.4 },
        qrScans: { current: 18, previous: 15, change: 20.0 },
        reservations: { current: 8, total: 12 },
        activeTables: 3,
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <div className="card-elevated bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-semibold text-red-900 mb-2">Error Loading Insights</h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <button
            onClick={fetchInsights}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
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
          description="Aktive von heute insgesamt"
          className="md:col-span-1"
        />

        <MetricCard
          title="Belegte Tische"
          value={data.activeTables}
          icon={MapPin}
          gradient="from-pink-500 to-pink-600"
          description="Live Status aktualisiert"
          className="md:col-span-1"
        />
      </div>

      {/* Real-time Status */}
      <div className="card-elevated bg-gradient-to-r from-teal-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Live Dashboard</h3>
            <p className="text-white/80 text-sm">
              Daten werden alle 5 Minuten aktualisiert •
              Letzte Aktualisierung: {new Date().toLocaleTimeString('de-DE')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
