import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  QrCode,
  Calendar,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  description?: string;
}

function MetricCard({ title, value, change, icon: Icon, description }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className="p-2 bg-gradient-to-br from-teal-500 to-purple-500 rounded-lg">
          <Icon className="w-4 h-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositive ? '+' : ''}
              {change.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500">vs. gestern</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function InsightsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [popularItems, setPopularItems] = useState<any[]>([]);

  // TODO: Get businessId from context/state
  const businessId = 'demo-business-id';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = await getToken();
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // Load overview metrics
      const overviewRes = await fetch(
        `/api/dashboard/insights/overview?businessId=${businessId}`,
        { headers }
      );
      const overviewData = await overviewRes.json();
      if (overviewData.success) {
        setOverview(overviewData.data);
      }

      // Load revenue chart
      const revenueRes = await fetch(
        `/api/dashboard/insights/revenue-chart?businessId=${businessId}&days=30`,
        { headers }
      );
      const revenueResult = await revenueRes.json();
      if (revenueResult.success) {
        setRevenueData(revenueResult.data);
      }

      // Load traffic sources
      const trafficRes = await fetch(
        `/api/dashboard/insights/traffic-sources?businessId=${businessId}`,
        { headers }
      );
      const trafficResult = await trafficRes.json();
      if (trafficResult.success) {
        setTrafficSources(trafficResult.data);
      }

      // Load popular items
      const itemsRes = await fetch(
        `/api/dashboard/insights/popular-items?businessId=${businessId}&limit=5`,
        { headers }
      );
      const itemsResult = await itemsRes.json();
      if (itemsResult.success) {
        setPopularItems(itemsResult.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-purple-500 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Analytics...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#0d9488', '#7c3aed', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <div className="space-y-8">
      {/* Top Metrics - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Umsatz heute"
          value={`€${overview?.revenue.current || 0}`}
          change={overview?.revenue.change}
          icon={DollarSign}
        />
        <MetricCard
          title="Bestellungen"
          value={overview?.orders.current || 0}
          change={overview?.orders.change}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Besucher"
          value={overview?.visitors.current || 0}
          change={overview?.visitors.change}
          icon={Users}
        />
        <MetricCard
          title="QR Scans"
          value={overview?.qrScans.current || 0}
          change={overview?.qrScans.change}
          icon={QrCode}
        />
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - Large */}
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Umsatz-Entwicklung (30 Tage)
            </CardTitle>
            <p className="text-sm text-gray-500">
              Täglicher Umsatz und Bestellvolumen
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}.${date.getMonth() + 1}`;
                  }}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [`€${value}`, 'Umsatz']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Heute im Überblick
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-teal-100/50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">Reservierungen</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview?.reservations.current || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-teal-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">Aktive Tische</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview?.activeTables || 0}
                </p>
              </div>
              <QrCode className="w-8 h-8 text-purple-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">Ø Bestellwert</p>
                <p className="text-2xl font-bold text-gray-900">
                  €
                  {overview?.revenue.current && overview?.orders.current
                    ? (overview.revenue.current / overview.orders.current).toFixed(2)
                    : '0.00'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Traffic-Quellen
            </CardTitle>
            <p className="text-sm text-gray-500">Letzte 7 Tage</p>
          </CardHeader>
          <CardContent>
            {trafficSources.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={trafficSources}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.source}: ${entry.percentage.toFixed(0)}%`}
                  >
                    {trafficSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Keine Daten verfügbar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Items */}
        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Beliebte Gerichte
            </CardTitle>
            <p className="text-sm text-gray-500">Top 5 der letzten 30 Tage</p>
          </CardHeader>
          <CardContent>
            {popularItems.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={popularItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#6b7280"
                    fontSize={12}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[0, 8, 8, 0]}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Keine Bestelldaten verfügbar
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
