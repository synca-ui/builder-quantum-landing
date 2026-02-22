/**
 * Floor Plan Dashboard Page
 * Interactive SVG editor for table management with QR codes
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MapPin,
  Plus,
  QrCode,
  Trash2,
  Save,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Download,
  MoreHorizontal,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { cn } from "../../lib/utils";

interface Table {
  id: string;
  number: string;
  name?: string;
  x: number;
  y: number;
  rotation: number;
  shape: "ROUND" | "SQUARE" | "RECTANGLE";
  width: number;
  height: number;
  minCapacity: number;
  maxCapacity: number;
  qrEnabled: boolean;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
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

export default function FloorPlanPage() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get("businessId") || undefined;

  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<FloorPlan | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFloorPlans();
  }, [businessId]);

  const fetchFloorPlans = async () => {
    try {
      setLoading(true);

      // Use demo data for now
      const mockFloorPlan: FloorPlan = {
        id: "floor-main-dining",
        name: "Hauptbereich",
        description: "Hauptessbereich mit 8 Tischen",
        width: 1000,
        height: 800,
        gridSize: 20,
        bgColor: "#f8fafc",
        tables: [
          {
            id: "table-1",
            number: "1",
            name: "Tisch 1",
            x: 100,
            y: 100,
            rotation: 0,
            shape: "ROUND",
            width: 80,
            height: 80,
            minCapacity: 2,
            maxCapacity: 4,
            qrEnabled: true,
            status: "AVAILABLE",
          },
          {
            id: "table-2",
            number: "2",
            name: "Tisch 2",
            x: 300,
            y: 100,
            rotation: 0,
            shape: "SQUARE",
            width: 100,
            height: 100,
            minCapacity: 4,
            maxCapacity: 6,
            qrEnabled: true,
            status: "OCCUPIED",
          },
          {
            id: "table-3",
            number: "3",
            name: "Tisch 3",
            x: 500,
            y: 200,
            rotation: 0,
            shape: "RECTANGLE",
            width: 120,
            height: 80,
            minCapacity: 6,
            maxCapacity: 8,
            qrEnabled: false,
            status: "AVAILABLE",
          },
        ],
      };

      setFloorPlans([mockFloorPlan]);
      setSelectedPlan(mockFloorPlan);
    } catch (error) {
      console.error("Error fetching floor plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const addNewTable = () => {
    if (!selectedPlan) return;

    const newTable: Table = {
      id: `table-${Date.now()}`,
      number: String(selectedPlan.tables.length + 1),
      name: `Tisch ${selectedPlan.tables.length + 1}`,
      x: 200,
      y: 200,
      rotation: 0,
      shape: "ROUND",
      width: 80,
      height: 80,
      minCapacity: 2,
      maxCapacity: 4,
      qrEnabled: false,
      status: "AVAILABLE",
    };

    setSelectedPlan({
      ...selectedPlan,
      tables: [...selectedPlan.tables, newTable],
    });
  };

  const deleteTable = (tableId: string) => {
    if (!selectedPlan) return;

    setSelectedPlan({
      ...selectedPlan,
      tables: selectedPlan.tables.filter((t) => t.id !== tableId),
    });
    setSelectedTable(null);
  };

  const getTableStatusColor = (status: Table["status"]) => {
    const colors = {
      AVAILABLE: "fill-green-200 stroke-green-600",
      OCCUPIED: "fill-red-200 stroke-red-600",
      RESERVED: "fill-yellow-200 stroke-yellow-600",
      MAINTENANCE: "fill-gray-200 stroke-gray-600",
    };
    return colors[status];
  };

  if (loading) {
    return (
      <DashboardLayout businessId={businessId}>
        <div className="card-elevated bg-white rounded-2xl p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
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
            <h1 className="text-3xl font-bold text-gray-900">Mein Lokal</h1>
            <p className="text-gray-600 mt-2">
              Interaktiver Lageplan-Editor mit QR-Code-Management
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
                showGrid
                  ? "bg-teal-100 text-teal-700 border border-teal-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              <Grid3X3 className="w-4 h-4" />
              <span>Raster</span>
            </button>

            <button
              onClick={addNewTable}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tisch hinzufügen</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Floor Plan Editor */}
          <div className="xl:col-span-3">
            <div className="card-elevated bg-white rounded-2xl overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <h3 className="font-semibold text-gray-900">
                    {selectedPlan?.name || "Lageplan"}
                  </h3>

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
                  <button className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>

                  <button className="flex items-center space-x-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm">
                    <Save className="w-4 h-4" />
                    <span>Speichern</span>
                  </button>
                </div>
              </div>

              {/* SVG Editor */}
              <div
                className="relative overflow-auto"
                style={{ height: "600px" }}
              >
                {selectedPlan && (
                  <svg
                    width={selectedPlan.width * zoom}
                    height={selectedPlan.height * zoom}
                    className="cursor-crosshair"
                    style={{ backgroundColor: selectedPlan.bgColor }}
                  >
                    {/* Grid */}
                    {showGrid && (
                      <defs>
                        <pattern
                          id="grid"
                          width={selectedPlan.gridSize * zoom}
                          height={selectedPlan.gridSize * zoom}
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d={`M ${selectedPlan.gridSize * zoom} 0 L 0 0 0 ${selectedPlan.gridSize * zoom}`}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                        </pattern>
                      </defs>
                    )}

                    {showGrid && (
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    )}

                    {/* Tables */}
                    {selectedPlan.tables.map((table) => {
                      const x = table.x * zoom;
                      const y = table.y * zoom;
                      const width = table.width * zoom;
                      const height = table.height * zoom;

                      return (
                        <g key={table.id}>
                          {/* Table Shape */}
                          {table.shape === "ROUND" && (
                            <circle
                              cx={x + width / 2}
                              cy={y + height / 2}
                              r={width / 2}
                              className={cn(
                                "cursor-pointer stroke-2 transition-all hover:stroke-4",
                                getTableStatusColor(table.status),
                                selectedTable?.id === table.id &&
                                  "stroke-purple-600 stroke-4",
                              )}
                              onClick={() => setSelectedTable(table)}
                            />
                          )}

                          {table.shape === "SQUARE" && (
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              rx="8"
                              className={cn(
                                "cursor-pointer stroke-2 transition-all hover:stroke-4",
                                getTableStatusColor(table.status),
                                selectedTable?.id === table.id &&
                                  "stroke-purple-600 stroke-4",
                              )}
                              onClick={() => setSelectedTable(table)}
                            />
                          )}

                          {table.shape === "RECTANGLE" && (
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              rx="8"
                              className={cn(
                                "cursor-pointer stroke-2 transition-all hover:stroke-4",
                                getTableStatusColor(table.status),
                                selectedTable?.id === table.id &&
                                  "stroke-purple-600 stroke-4",
                              )}
                              onClick={() => setSelectedTable(table)}
                            />
                          )}

                          {/* Table Number */}
                          <text
                            x={x + width / 2}
                            y={y + height / 2}
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
                              cx={x + width - 8}
                              cy={y + 8}
                              r="6"
                              className="fill-teal-500"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="xl:col-span-1 space-y-6">
            {/* Table Properties */}
            {selectedTable ? (
              <div className="card-elevated bg-white rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Tisch Eigenschaften
                  </h3>
                  <button
                    onClick={() => deleteTable(selectedTable.id)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tischnummer
                    </label>
                    <input
                      type="text"
                      value={selectedTable.number}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      onChange={(e) =>
                        setSelectedTable({
                          ...selectedTable,
                          number: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Form
                    </label>
                    <select
                      value={selectedTable.shape}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      onChange={(e) =>
                        setSelectedTable({
                          ...selectedTable,
                          shape: e.target.value as Table["shape"],
                        })
                      }
                    >
                      <option value="ROUND">Rund</option>
                      <option value="SQUARE">Quadrat</option>
                      <option value="RECTANGLE">Rechteck</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min. Gäste
                      </label>
                      <input
                        type="number"
                        value={selectedTable.minCapacity}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        onChange={(e) =>
                          setSelectedTable({
                            ...selectedTable,
                            minCapacity: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max. Gäste
                      </label>
                      <input
                        type="number"
                        value={selectedTable.maxCapacity}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        onChange={(e) =>
                          setSelectedTable({
                            ...selectedTable,
                            maxCapacity: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={selectedTable.status}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      onChange={(e) =>
                        setSelectedTable({
                          ...selectedTable,
                          status: e.target.value as Table["status"],
                        })
                      }
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
                    <button
                      onClick={() =>
                        setSelectedTable({
                          ...selectedTable,
                          qrEnabled: !selectedTable.qrEnabled,
                        })
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        selectedTable.qrEnabled ? "bg-teal-600" : "bg-gray-200",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          selectedTable.qrEnabled
                            ? "translate-x-6"
                            : "translate-x-1",
                        )}
                      />
                    </button>
                  </div>

                  {selectedTable.qrEnabled && (
                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all">
                      <QrCode className="w-4 h-4" />
                      <span>QR-Code anzeigen</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-elevated bg-white rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Tisch auswählen
                </h3>
                <p className="text-sm text-gray-500">
                  Klicken Sie auf einen Tisch, um ihn zu bearbeiten
                </p>
              </div>
            )}

            {/* Plan Stats */}
            <div className="card-elevated bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Plan-Statistiken
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gesamte Tische</span>
                  <span className="font-medium text-gray-900">
                    {selectedPlan?.tables.length || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mit QR-Code</span>
                  <span className="font-medium text-gray-900">
                    {selectedPlan?.tables.filter((t) => t.qrEnabled).length ||
                      0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Verfügbar</span>
                  <span className="font-medium text-green-600">
                    {selectedPlan?.tables.filter(
                      (t) => t.status === "AVAILABLE",
                    ).length || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Besetzt</span>
                  <span className="font-medium text-red-600">
                    {selectedPlan?.tables.filter((t) => t.status === "OCCUPIED")
                      .length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
