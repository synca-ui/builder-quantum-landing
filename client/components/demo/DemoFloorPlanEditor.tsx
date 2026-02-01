/**
 * Demo Floor Plan Editor Component - Enterprise SaaS Grade
 * Advanced table management with drag-and-drop, QR generation, and real-time analytics
 */

import React, { useState } from 'react';
import {
  Layout,
  Plus,
  Settings,
  QrCode,
  Users,
  RotateCw,
  Copy,
  Trash2,
  Eye,
  BarChart3,
  DollarSign,
  TrendingUp,
  Maximize2,
  Grid3X3,
  Palette,
  Save,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Table {
  id: string;
  number: string;
  name?: string;
  x: number;
  y: number;
  rotation: number;
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE';
  width: number;
  height: number;
  minCapacity: number;
  maxCapacity: number;
  qrEnabled: boolean;
  qrCode?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
}

interface FloorPlan {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  gridSize: number;
  bgColor: string;
  tables: Table[];
}

interface TableAnalytics {
  tableId: string;
  occupancyRate: number;
  avgTurnover: number;
  revenue: number;
  reservations: number;
}

export default function DemoFloorPlanEditor() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'analytics'>('edit');
  const [draggedTable, setDraggedTable] = useState<Table | null>(null);

  // Professional demo floor plan
  const [floorPlan, setFloorPlan] = useState<FloorPlan>({
    id: 'demo-floor-1',
    name: 'Hauptbereich',
    description: 'Haupt-Restaurantbereich mit 15 Tischen',
    width: 800,
    height: 600,
    gridSize: 20,
    bgColor: '#f8fafc',
    tables: [
      {
        id: 't1', number: '1', x: 100, y: 100, rotation: 0, shape: 'ROUND',
        width: 80, height: 80, minCapacity: 2, maxCapacity: 4,
        qrEnabled: true, qrCode: 'QR001', status: 'AVAILABLE'
      },
      {
        id: 't2', number: '2', x: 220, y: 100, rotation: 0, shape: 'SQUARE',
        width: 80, height: 80, minCapacity: 2, maxCapacity: 6,
        qrEnabled: true, qrCode: 'QR002', status: 'OCCUPIED'
      },
      {
        id: 't3', number: '3', x: 100, y: 220, rotation: 0, shape: 'RECTANGLE',
        width: 120, height: 80, minCapacity: 4, maxCapacity: 8,
        qrEnabled: true, qrCode: 'QR003', status: 'RESERVED'
      },
      {
        id: 't4', number: '4', x: 340, y: 150, rotation: 45, shape: 'ROUND',
        width: 60, height: 60, minCapacity: 2, maxCapacity: 4,
        qrEnabled: false, status: 'AVAILABLE'
      },
      {
        id: 't5', number: '5', x: 500, y: 120, rotation: 0, shape: 'RECTANGLE',
        width: 140, height: 80, minCapacity: 6, maxCapacity: 10,
        qrEnabled: true, qrCode: 'QR005', status: 'AVAILABLE', name: 'VIP-Bereich'
      }
    ]
  });

  // Advanced analytics data
  const tableAnalytics: TableAnalytics[] = [
    { tableId: 't1', occupancyRate: 85, avgTurnover: 2.3, revenue: 1247, reservations: 12 },
    { tableId: 't2', occupancyRate: 92, avgTurnover: 2.8, revenue: 1856, reservations: 18 },
    { tableId: 't3', occupancyRate: 78, avgTurnover: 1.9, revenue: 2134, reservations: 15 },
    { tableId: 't4', occupancyRate: 65, avgTurnover: 2.1, revenue: 892, reservations: 8 },
    { tableId: 't5', occupancyRate: 95, avgTurnover: 1.8, revenue: 3245, reservations: 22 }
  ];

  const getTableStatusColor = (status: string) => {
    const colors = {
      'AVAILABLE': 'bg-green-100 border-green-300 text-green-700',
      'OCCUPIED': 'bg-red-100 border-red-300 text-red-700',
      'RESERVED': 'bg-blue-100 border-blue-300 text-blue-700',
      'MAINTENANCE': 'bg-gray-100 border-gray-300 text-gray-700'
    };
    return colors[status as keyof typeof colors] || colors.AVAILABLE;
  };

  const getShapeStyles = (table: Table) => {
    const baseStyles = 'border-2 cursor-pointer transition-all hover:shadow-lg';
    const statusStyles = getTableStatusColor(table.status);
    const selectedStyles = selectedTable === table.id ? 'ring-4 ring-blue-400 ring-opacity-60' : '';

    let shapeStyles = '';
    switch (table.shape) {
      case 'ROUND':
        shapeStyles = 'rounded-full';
        break;
      case 'SQUARE':
        shapeStyles = 'rounded-lg';
        break;
      case 'RECTANGLE':
        shapeStyles = 'rounded-lg';
        break;
    }

    return cn(baseStyles, statusStyles, shapeStyles, selectedStyles);
  };

  const handleTableDragStart = (table: Table) => {
    setDraggedTable(table);
  };

  const handleTableDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTable) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFloorPlan(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === draggedTable.id ? { ...t, x: Math.max(0, x - 40), y: Math.max(0, y - 40) } : t
      )
    }));

    setDraggedTable(null);
  };

  const addNewTable = () => {
    const newTable: Table = {
      id: `t${floorPlan.tables.length + 1}`,
      number: (floorPlan.tables.length + 1).toString(),
      x: 200,
      y: 200,
      rotation: 0,
      shape: 'ROUND',
      width: 80,
      height: 80,
      minCapacity: 2,
      maxCapacity: 4,
      qrEnabled: false,
      status: 'AVAILABLE'
    };

    setFloorPlan(prev => ({
      ...prev,
      tables: [...prev.tables, newTable]
    }));
  };

  const duplicateTable = (tableId: string) => {
    const table = floorPlan.tables.find(t => t.id === tableId);
    if (!table) return;

    const newTable: Table = {
      ...table,
      id: `t${Date.now()}`,
      number: (floorPlan.tables.length + 1).toString(),
      x: table.x + 100,
      y: table.y + 50,
      qrCode: undefined
    };

    setFloorPlan(prev => ({
      ...prev,
      tables: [...prev.tables, newTable]
    }));
  };

  const deleteTable = (tableId: string) => {
    setFloorPlan(prev => ({
      ...prev,
      tables: prev.tables.filter(t => t.id !== tableId)
    }));
    if (selectedTable === tableId) {
      setSelectedTable(null);
    }
  };

  const generateQRCode = (tableId: string) => {
    setFloorPlan(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId ? {
          ...t,
          qrEnabled: true,
          qrCode: `QR${t.number.padStart(3, '0')}`
        } : t
      )
    }));
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <span>Smart Floor Plan Editor</span>
                <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs font-bold rounded-full">
                  LIVE SYNC
                </div>
              </h1>
              <p className="text-gray-600 mt-1">Intelligente Tischverwaltung mit Echtzeit-Analytics</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              {[
                { key: 'edit', label: 'Editor', icon: Settings },
                { key: 'preview', label: 'Preview', icon: Eye },
                { key: 'analytics', label: 'Analytics', icon: BarChart3 }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as 'edit' | 'preview' | 'analytics')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center space-x-1',
                    viewMode === key
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Smart Tools */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={cn(
                'p-2 rounded-lg text-sm font-medium transition-colors',
                showGrid ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-md">
              <Save className="w-4 h-4" />
              <span>Speichern</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Floor Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          {
            title: 'Tische Total',
            value: floorPlan.tables.length,
            change: '+2 diese Woche',
            icon: Layout,
            color: 'from-purple-500 to-purple-600'
          },
          {
            title: 'Verfügbare Plätze',
            value: floorPlan.tables.reduce((sum, t) => sum + t.maxCapacity, 0),
            change: 'Kapazität: 100%',
            icon: Users,
            color: 'from-blue-500 to-blue-600'
          },
          {
            title: 'QR-Codes Aktiv',
            value: floorPlan.tables.filter(t => t.qrEnabled).length,
            change: `${Math.round((floorPlan.tables.filter(t => t.qrEnabled).length / floorPlan.tables.length) * 100)}% Coverage`,
            icon: QrCode,
            color: 'from-green-500 to-green-600'
          },
          {
            title: 'Auslastung',
            value: '73%',
            change: 'Live-Durchschnitt',
            icon: TrendingUp,
            color: 'from-orange-500 to-orange-600'
          },
          {
            title: 'Umsatz/m²',
            value: '€156',
            change: '+12% vs. letzten Monat',
            icon: DollarSign,
            color: 'from-emerald-500 to-emerald-600'
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
        {/* Tools Panel */}
        <div className="xl:col-span-1">
          <div className="card-elevated bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Design Tools</h3>
              <Palette className="w-5 h-5 text-purple-600" />
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 mb-6">
              <button
                onClick={addNewTable}
                className="w-full flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Neuer Tisch</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                  <Copy className="w-4 h-4" />
                  <span>Duplikat</span>
                </button>
                <button className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                  <RotateCw className="w-4 h-4" />
                  <span>Drehen</span>
                </button>
              </div>
            </div>

            {/* Table Shapes */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Tisch-Formen</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { shape: 'ROUND', icon: '●' },
                  { shape: 'SQUARE', icon: '■' },
                  { shape: 'RECTANGLE', icon: '▬' }
                ].map(({ shape, icon }) => (
                  <button
                    key={shape}
                    className="flex flex-col items-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-gray-600 hover:text-purple-600"
                  >
                    <span className="text-2xl mb-1">{icon}</span>
                    <span className="text-xs font-medium">{shape}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table List */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Tisch-Liste</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {floorPlan.tables.map((table) => {
                  const analytics = tableAnalytics.find(a => a.tableId === table.id);
                  return (
                    <div
                      key={table.id}
                      onClick={() => setSelectedTable(table.id)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                        selectedTable === table.id
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            Tisch {table.number}
                          </span>
                          {table.qrEnabled && (
                            <QrCode className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          getTableStatusColor(table.status)
                        )}>
                          {table.status}
                        </div>
                      </div>

                      {table.name && (
                        <p className="text-sm text-gray-600 mb-1">{table.name}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{table.minCapacity}-{table.maxCapacity} Plätze</span>
                        {analytics && (
                          <span className="font-medium text-green-600">
                            {analytics.occupancyRate}% belegt
                          </span>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center space-x-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateTable(table.id);
                          }}
                          className="p-1 rounded hover:bg-purple-100 text-purple-600"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {!table.qrEnabled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateQRCode(table.id);
                            }}
                            className="p-1 rounded hover:bg-green-100 text-green-600"
                          >
                            <QrCode className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTable(table.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Floor Plan Canvas */}
        <div className="xl:col-span-3">
          <div className="card-elevated bg-white rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <span>{floorPlan.name}</span>
                    {viewMode === 'edit' && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}  </h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {floorPlan.description} • {floorPlan.width}x{floorPlan.height}px
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {viewMode === 'analytics' && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Live Analytics</span>
                    </div>
                  )}
                  <button className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                    <Maximize2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="p-6">
              <div
                className="relative border-2 border-gray-200 rounded-xl overflow-hidden"
                style={{
                  width: '100%',
                  height: '500px',
                  backgroundColor: floorPlan.bgColor,
                  backgroundImage: showGrid ? `
                    linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                  ` : 'none',
                  backgroundSize: showGrid ? `${floorPlan.gridSize}px ${floorPlan.gridSize}px` : 'auto'
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleTableDrop}
              >
                {/* Render Tables */}
                {floorPlan.tables.map((table) => {
                  const analytics = tableAnalytics.find(a => a.tableId === table.id);

                  return (
                    <div
                      key={table.id}
                      draggable
                      onDragStart={() => handleTableDragStart(table)}
                      onClick={() => setSelectedTable(table.id)}
                      className={cn(getShapeStyles(table), 'absolute flex items-center justify-center select-none group')}
                      style={{
                        left: table.x,
                        top: table.y,
                        width: table.width,
                        height: table.height,
                        transform: `rotate(${table.rotation}deg)`
                      }}
                    >
                      {/* Table Content */}
                      <div className="text-center">
                        <div className="font-bold text-lg">{table.number}</div>
                        {table.name && (
                          <div className="text-xs mt-1 opacity-80">{table.name}</div>
                        )}
                        <div className="text-xs opacity-70">
                          {table.minCapacity}-{table.maxCapacity}
                        </div>
                      </div>

                      {/* QR Code Indicator */}
                      {table.qrEnabled && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <QrCode className="w-3 h-3 text-white" />
                        </div>
                      )}

                      {/* Analytics Overlay */}
                      {viewMode === 'analytics' && analytics && (
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          <div>Auslastung: {analytics.occupancyRate}%</div>
                          <div>Umsatz: €{analytics.revenue}</div>
                          <div>Ø Wechsel: {analytics.avgTurnover}x</div>
                        </div>
                      )}

                      {/* Selection Handles */}
                      {selectedTable === table.id && viewMode === 'edit' && (
                        <>
                          {/* Corner resize handles */}
                          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-nw-resize"></div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-ne-resize"></div>
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-sw-resize"></div>
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-se-resize"></div>

                          {/* Rotation handle */}
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full border-2 border-white cursor-grab">
                            <RotateCw className="w-2 h-2 text-white absolute inset-0.5" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Drop Zone Indicator */}
                {draggedTable && (
                  <div className="absolute inset-0 bg-purple-100/50 border-2 border-dashed border-purple-400 rounded-xl flex items-center justify-center">
                    <div className="text-purple-600 font-medium">
                      Tisch hier ablegen...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {viewMode === 'analytics' && (
        <div className="card-elevated bg-white rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Table Performance Analytics</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">Detaillierte Leistungsanalyse aller Tische</p>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
              Vollständiger Report
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {tableAnalytics.map((analytics) => {
              const table = floorPlan.tables.find(t => t.id === analytics.tableId);
              if (!table) return null;

              return (
                <div key={analytics.tableId} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold',
                        analytics.occupancyRate >= 90 ? 'bg-green-500' :
                        analytics.occupancyRate >= 70 ? 'bg-blue-500' :
                        analytics.occupancyRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      )}>
                        {table.number}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Tisch {table.number}</p>
                        {table.name && (
                          <p className="text-xs text-gray-600">{table.name}</p>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      'text-lg font-bold',
                      analytics.occupancyRate >= 85 ? 'text-green-600' :
                      analytics.occupancyRate >= 70 ? 'text-blue-600' :
                      'text-yellow-600'
                    )}>
                      {analytics.occupancyRate}%
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Umsatz heute</span>
                      <span className="font-semibold text-gray-900">€{analytics.revenue}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Durchschnittliche Wechsel</span>
                      <span className="font-semibold text-gray-900">{analytics.avgTurnover}x</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Reservierungen</span>
                      <span className="font-semibold text-gray-900">{analytics.reservations}</span>
                    </div>

                    {/* Performance Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Performance</span>
                        <span>{analytics.occupancyRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            analytics.occupancyRate >= 85 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            analytics.occupancyRate >= 70 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                            'bg-gradient-to-r from-yellow-400 to-yellow-600'
                          )}
                          style={{ width: `${analytics.occupancyRate}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Revenue per m² calculation */}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Umsatz/m² (geschätzt)</span>
                        <span className="font-medium text-green-600">
                          €{Math.round(analytics.revenue / ((table.width * table.height) / 10000))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
