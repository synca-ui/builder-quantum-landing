import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Plus,
  Download,
  QrCode,
  RotateCw,
  Trash2,
  Save,
  Grid3x3,
  Circle,
  Square,
  RectangleHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Table {
  id: string;
  number: string;
  name?: string;
  x: number;
  y: number;
  rotation: number;
  shape: 'round' | 'square' | 'rectangle';
  width: number;
  height: number;
  minCapacity: number;
  maxCapacity: number;
  qrEnabled: boolean;
  qrCode?: string;
  qrCodeImage?: string;
}

interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  gridSize: number;
  bgColor: string;
  tables: Table[];
}

const SHAPES = [
  { value: 'round', label: 'Rund', icon: Circle },
  { value: 'square', label: 'Quadratisch', icon: Square },
  { value: 'rectangle', label: 'Rechteckig', icon: RectangleHorizontal },
];

export default function FloorPlanPage() {
  const { getToken } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<FloorPlan | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showAddTable, setShowAddTable] = useState(false);
  const [showQRCode, setShowQRCode] = useState<Table | null>(null);
  const [gridVisible, setGridVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  const businessId = 'demo-business-id';

  useEffect(() => {
    loadFloorPlans();
  }, []);

  const loadFloorPlans = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `/api/dashboard/floor-plan/plans?businessId=${businessId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        setFloorPlans(result.data);
        setCurrentPlan(result.data[0]);
        setTables(result.data[0].tables || []);
      }
    } catch (error) {
      console.error('Error loading floor plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (tableId: string, e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation();
    const table = tables.find((t) => t.id === tableId);
    if (!table || !svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    setDraggingTable(tableId);
    setSelectedTable(tableId);
    setDragOffset({
      x: svgP.x - table.x,
      y: svgP.y - table.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingTable || !svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const gridSize = currentPlan?.gridSize || 20;
    let newX = svgP.x - dragOffset.x;
    let newY = svgP.y - dragOffset.y;

    // Snap to grid
    newX = Math.round(newX / gridSize) * gridSize;
    newY = Math.round(newY / gridSize) * gridSize;

    // Update table position
    setTables((prev) =>
      prev.map((table) =>
        table.id === draggingTable ? { ...table, x: newX, y: newY } : table
      )
    );
  };

  const handleMouseUp = async () => {
    if (draggingTable) {
      // Save position to backend
      const table = tables.find((t) => t.id === draggingTable);
      if (table) {
        await updateTable(table.id, { x: table.x, y: table.y });
      }
      setDraggingTable(null);
    }
  };

  const updateTable = async (tableId: string, updates: Partial<Table>) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/dashboard/floor-plan/tables/${tableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      if (result.success) {
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, ...result.data } : t))
        );
      }
    } catch (error) {
      console.error('Error updating table:', error);
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!confirm('Möchten Sie diesen Tisch wirklich löschen?')) return;

    try {
      const token = await getToken();
      await fetch(`/api/dashboard/floor-plan/tables/${tableId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      setTables((prev) => prev.filter((t) => t.id !== tableId));
      setSelectedTable(null);
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  const rotateTable = async (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const newRotation = (table.rotation + 90) % 360;
    await updateTable(tableId, { rotation: newRotation });
  };

  const toggleQRCode = async (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    await updateTable(tableId, { qrEnabled: !table.qrEnabled });
  };

  const createTable = async (data: Partial<Table>) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/dashboard/floor-plan/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          floorPlanId: currentPlan?.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTables((prev) => [...prev, result.data]);
        setShowAddTable(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error creating table:', error);
    }
  };

  const downloadFloorPlan = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `floor-plan-${currentPlan?.name || 'layout'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedTableData = selectedTable
    ? tables.find((t) => t.id === selectedTable)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-purple-500 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Lageplan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lageplan Editor</h2>
          <p className="text-gray-600 mt-1">
            {tables.length} Tische · {tables.filter((t) => t.qrEnabled).length} mit QR-Code
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setGridVisible(!gridVisible)}
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            {gridVisible ? 'Raster ausblenden' : 'Raster anzeigen'}
          </Button>

          <Button variant="outline" onClick={downloadFloorPlan}>
            <Download className="w-4 h-4 mr-2" />
            Exportieren
          </Button>

          <Button
            onClick={() => setShowAddTable(true)}
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tisch hinzufügen
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor Canvas */}
        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
              <svg
                ref={svgRef}
                width={currentPlan?.width || 800}
                height={currentPlan?.height || 600}
                viewBox={`0 0 ${currentPlan?.width || 800} ${currentPlan?.height || 600}`}
                className="w-full h-auto"
                style={{ backgroundColor: currentPlan?.bgColor || '#f8fafc' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid */}
                {gridVisible && (
                  <defs>
                    <pattern
                      id="grid"
                      width={currentPlan?.gridSize || 20}
                      height={currentPlan?.gridSize || 20}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${currentPlan?.gridSize || 20} 0 L 0 0 0 ${currentPlan?.gridSize || 20}`}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                )}
                {gridVisible && (
                  <rect
                    width="100%"
                    height="100%"
                    fill="url(#grid)"
                  />
                )}

                {/* Tables */}
                {tables.map((table) => (
                  <g
                    key={table.id}
                    transform={`translate(${table.x}, ${table.y}) rotate(${table.rotation} ${table.width / 2} ${table.height / 2})`}
                    onMouseDown={(e) => handleMouseDown(table.id, e)}
                    className="cursor-move hover:opacity-80 transition-opacity"
                  >
                    {/* Table Shape */}
                    {table.shape === 'round' ? (
                      <circle
                        cx={table.width / 2}
                        cy={table.height / 2}
                        r={table.width / 2}
                        fill={selectedTable === table.id ? '#0d9488' : '#ffffff'}
                        stroke={selectedTable === table.id ? '#0d9488' : '#6b7280'}
                        strokeWidth={selectedTable === table.id ? 3 : 2}
                      />
                    ) : (
                      <rect
                        width={table.width}
                        height={table.height}
                        rx={table.shape === 'square' ? 8 : 4}
                        fill={selectedTable === table.id ? '#0d9488' : '#ffffff'}
                        stroke={selectedTable === table.id ? '#0d9488' : '#6b7280'}
                        strokeWidth={selectedTable === table.id ? 3 : 2}
                      />
                    )}

                    {/* Table Number */}
                    <text
                      x={table.width / 2}
                      y={table.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-bold text-sm pointer-events-none select-none"
                      fill={selectedTable === table.id ? '#ffffff' : '#111827'}
                    >
                      {table.number}
                    </text>

                    {/* Capacity */}
                    <text
                      x={table.width / 2}
                      y={table.height / 2 + 16}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs pointer-events-none select-none"
                      fill={selectedTable === table.id ? '#ffffff' : '#6b7280'}
                    >
                      {table.maxCapacity} Pers.
                    </text>

                    {/* QR Code Indicator */}
                    {table.qrEnabled && (
                      <g transform={`translate(${table.width - 16}, 4)`}>
                        <circle cx="8" cy="8" r="8" fill="#7c3aed" />
                        <text
                          x="8"
                          y="8"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs font-bold pointer-events-none"
                          fill="#ffffff"
                        >
                          QR
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Properties Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedTableData ? `Tisch ${selectedTableData.number}` : 'Eigenschaften'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTableData ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Position</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">X</p>
                      <p className="text-sm font-semibold">{Math.round(selectedTableData.x)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Y</p>
                      <p className="text-sm font-semibold">{Math.round(selectedTableData.y)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Kapazität</Label>
                  <p className="text-sm mt-1">
                    {selectedTableData.minCapacity} - {selectedTableData.maxCapacity} Personen
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Form</Label>
                  <p className="text-sm mt-1 capitalize">{selectedTableData.shape}</p>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">QR-Code</Label>
                  <Switch
                    checked={selectedTableData.qrEnabled}
                    onCheckedChange={() => toggleQRCode(selectedTableData.id)}
                  />
                </div>

                {selectedTableData.qrEnabled && selectedTableData.qrCodeImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQRCode(selectedTableData)}
                    className="w-full"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR-Code anzeigen
                  </Button>
                )}

                <div className="pt-4 space-y-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rotateTable(selectedTableData.id)}
                    className="w-full"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    90° drehen
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTable(selectedTableData.id)}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Tisch löschen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Grid3x3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Wähle einen Tisch aus, um Details zu sehen</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Table Dialog */}
      <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Tisch hinzufügen</DialogTitle>
          </DialogHeader>
          <AddTableForm
            onSubmit={createTable}
            onCancel={() => setShowAddTable(false)}
          />
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      {showQRCode && (
        <Dialog open={!!showQRCode} onOpenChange={() => setShowQRCode(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>QR-Code für Tisch {showQRCode.number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={showQRCode.qrCodeImage}
                  alt={`QR Code for table ${showQRCode.number}`}
                  className="w-64 h-64"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Bestell-URL</p>
                <p className="text-sm font-mono break-all">{showQRCode.qrCode}</p>
              </div>
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = showQRCode.qrCodeImage!;
                  link.download = `qr-code-table-${showQRCode.number}.png`;
                  link.click();
                }}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                QR-Code herunterladen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddTableForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Partial<Table>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    number: '',
    shape: 'round' as 'round' | 'square' | 'rectangle',
    maxCapacity: 4,
    qrEnabled: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      x: 100,
      y: 100,
      rotation: 0,
      width: formData.shape === 'rectangle' ? 120 : 80,
      height: 80,
      minCapacity: 2,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Tischnummer</Label>
        <Input
          value={formData.number}
          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
          placeholder="z.B. T1"
          required
        />
      </div>

      <div>
        <Label>Form</Label>
        <Select
          value={formData.shape}
          onValueChange={(value: any) => setFormData({ ...formData, shape: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHAPES.map((shape) => (
              <SelectItem key={shape.value} value={shape.value}>
                {shape.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Max. Kapazität</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={formData.maxCapacity}
          onChange={(e) =>
            setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>QR-Code aktivieren</Label>
        <Switch
          checked={formData.qrEnabled}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, qrEnabled: checked })
          }
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-teal-500 to-purple-500">
          Tisch erstellen
        </Button>
      </div>
    </form>
  );
}
