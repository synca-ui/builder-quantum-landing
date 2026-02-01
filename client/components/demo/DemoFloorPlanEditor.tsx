/**
 * Demo Floor Plan Editor Component
 * Simplified demo version with mock data
 */

import React, { useState } from 'react';
import { MapPin, Plus, QrCode, Grid3X3, ZoomIn, ZoomOut, Download, Save, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function DemoFloorPlanEditor() {
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(true);

  // Demo table data
  const demoTables = [
    { id: '1', number: '1', x: 100, y: 100, shape: 'ROUND', status: 'AVAILABLE', maxCapacity: 4, qrEnabled: true },
    { id: '2', number: '2', x: 300, y: 100, shape: 'SQUARE', status: 'OCCUPIED', maxCapacity: 6, qrEnabled: true },
    { id: '3', number: '3', x: 500, y: 200, shape: 'RECTANGLE', status: 'RESERVED', maxCapacity: 8, qrEnabled: false },
    { id: '4', number: '4', x: 150, y: 300, shape: 'ROUND', status: 'AVAILABLE', maxCapacity: 4, qrEnabled: true },
    { id: '5', number: '5', x: 400, y: 350, shape: 'SQUARE', status: 'AVAILABLE', maxCapacity: 6, qrEnabled: true },
  ];

  const getTableStatusColor = (status: string) => {
    const colors = {
      AVAILABLE: 'fill-green-200 stroke-green-600',
      OCCUPIED: 'fill-red-200 stroke-red-600',
      RESERVED: 'fill-yellow-200 stroke-yellow-600',
      MAINTENANCE: 'fill-gray-200 stroke-gray-600',
    };
    return colors[status as keyof typeof colors] || colors.AVAILABLE;
  };

  const selectedTable = demoTables.find(t => t.id === selectedTableId);

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      {showDemo && (
        <div className="card-elevated bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">Demo Lageplan-Editor</h3>
                <p className="text-purple-700 text-sm mb-3">
                  Erlebe den interaktiven SVG-Editor mit Drag-and-Drop Tischen und QR-Code-Verwaltung.
                  Alle Funktionen sind voll funktionsfähig in der Demo.
                </p>
                <div className="flex items-center space-x-4 text-sm text-purple-600">
                  <span>✓ Interaktive Tische</span>
                  <span>✓ QR-Code Management</span>
                  <span>✓ Live Status Updates</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDemo(false)}
              className="text-purple-400 hover:text-purple-600 transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Floor Plan Editor */}
        <div className="xl:col-span-3">
          <div className="card-elevated bg-white rounded-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <h3 className="font-semibold text-gray-900">Demo Hauptbereich</h3>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>

                  <button
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm',
                    showGrid
                      ? 'bg-teal-100 text-teal-700 border border-teal-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>Raster</span>
                </button>

                <button className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export (Demo)</span>
                </button>

                <button className="flex items-center space-x-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm">
                  <Save className="w-4 h-4" />
                  <span>Speichern (Demo)</span>
                </button>
              </div>
            </div>

            {/* SVG Editor */}
            <div className="relative overflow-auto bg-gray-50" style={{ height: '600px' }}>
              <svg
                width={800 * zoom}
                height={600 * zoom}
                className="cursor-crosshair"
                style={{ backgroundColor: '#f8fafc' }}
              >
                {/* Grid */}
                {showGrid && (
                  <defs>
                    <pattern
                      id="demo-grid"
                      width={20 * zoom}
                      height={20 * zoom}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                )}

                {showGrid && (
                  <rect width="100%" height="100%" fill="url(#demo-grid)" />
                )}

                {/* Tables */}
                {demoTables.map((table) => {
                  const x = table.x * zoom;
                  const y = table.y * zoom;
                  const size = 80 * zoom;

                  return (
                    <g key={table.id}>
                      {/* Table Shape */}
                      {table.shape === 'ROUND' && (
                        <circle
                          cx={x + size / 2}
                          cy={y + size / 2}
                          r={size / 2}
                          className={cn(
                            'cursor-pointer stroke-2 transition-all hover:stroke-4',
                            getTableStatusColor(table.status),
                            selectedTableId === table.id && 'stroke-purple-600 stroke-4'
                          )}
                          onClick={() => setSelectedTableId(table.id)}
                        />
                      )}

                      {(table.shape === 'SQUARE' || table.shape === 'RECTANGLE') && (
                        <rect
                          x={x}
                          y={y}
                          width={table.shape === 'RECTANGLE' ? size * 1.4 : size}
                          height={size}
                          rx="8"
                          className={cn(
                            'cursor-pointer stroke-2 transition-all hover:stroke-4',
                            getTableStatusColor(table.status),
                            selectedTableId === table.id && 'stroke-purple-600 stroke-4'
                          )}
                          onClick={() => setSelectedTableId(table.id)}
                        />
                      )}

                      {/* Table Number */}
                      <text
                        x={x + (table.shape === 'RECTANGLE' ? size * 0.7 : size / 2)}
                        y={y + size / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-gray-900 font-semibold pointer-events-none"
                        fontSize={Math.max(12, 14 * zoom)}
                      >
                        {table.number}
                      </text>

                      {/* QR Code Indicator */}
                      {table.qrEnabled && (
                        <circle
                          cx={x + size - 12}
                          cy={y + 12}
                          r="8"
                          className="fill-teal-500"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="xl:col-span-1 space-y-6">
          {/* Table Properties */}
          {selectedTable ? (
            <div className="card-elevated bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tisch Eigenschaften (Demo)</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tischnummer
                  </label>
                  <input
                    type="text"
                    value={selectedTable.number}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Form
                  </label>
                  <select
                    value={selectedTable.shape}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  >
                    <option value="ROUND">Rund</option>
                    <option value="SQUARE">Quadrat</option>
                    <option value="RECTANGLE">Rechteck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max. Gäste
                  </label>
                  <input
                    type="number"
                    value={selectedTable.maxCapacity}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedTable.status}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  >
                    <option value="AVAILABLE">Verfügbar</option>
                    <option value="OCCUPIED">Besetzt</option>
                    <option value="RESERVED">Reserviert</option>
                    <option value="MAINTENANCE">Wartung</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    QR-Code aktiviert
                  </label>
                  <div className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full',
                    selectedTable.qrEnabled ? 'bg-teal-600' : 'bg-gray-200'
                  )}>
                    <span className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      selectedTable.qrEnabled ? 'translate-x-6' : 'translate-x-1'
                    )} />
                  </div>
                </div>

                {selectedTable.qrEnabled && (
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all">
                    <QrCode className="w-4 h-4" />
                    <span>QR-Code anzeigen (Demo)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card-elevated bg-white rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Tisch auswählen</h3>
              <p className="text-sm text-gray-500">
                Klicken Sie auf einen Tisch, um ihn zu bearbeiten
              </p>
            </div>
          )}

          {/* Plan Stats */}
          <div className="card-elevated bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Plan-Statistiken (Demo)</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gesamte Tische</span>
                <span className="font-medium text-gray-900">{demoTables.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Mit QR-Code</span>
                <span className="font-medium text-gray-900">
                  {demoTables.filter(t => t.qrEnabled).length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Verfügbar</span>
                <span className="font-medium text-green-600">
                  {demoTables.filter(t => t.status === 'AVAILABLE').length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Besetzt</span>
                <span className="font-medium text-red-600">
                  {demoTables.filter(t => t.status === 'OCCUPIED').length}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                <Plus className="w-4 h-4" />
                <span>Tisch hinzufügen (Demo)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
