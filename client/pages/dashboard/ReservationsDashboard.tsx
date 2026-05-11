import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Plus, Search, MapPin, Clock, Calendar as CalendarIcon, User, RefreshCw, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfiguratorStore } from "@/store/configuratorStore";

interface Reservation {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCount: number;
  reservationTime: string;
  specialRequests: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "ARRIVED" | "COMPLETED" | "NO_SHOW";
}

export default function ReservationsDashboard() {
  const { getToken } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReservation, setNewReservation] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    guestCount: "2",
    reservationTime: "",
    specialRequests: "",
  });

  const configId = useConfiguratorStore(s => s.business.name ? "demo" : "demo"); // Actually we need configId. The best way is to fetch configurations and select the active one, or assume single tenant for now. Wait, how do other dashboard pages get configId?
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const token = await getToken();
        const res = await fetch("/api/configurations", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setActiveConfigId(data.data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    init();
  }, [getToken]);

  useEffect(() => {
    if (activeConfigId) {
      loadReservations();
    }
  }, [activeConfigId, getToken]);

  const loadReservations = async () => {
    if (!activeConfigId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/dashboard/reservations?configId=${activeConfigId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setReservations(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/dashboard/reservations/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setReservations(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleAddReservation = async () => {
    if (!activeConfigId) return;
    try {
      const token = await getToken();
      // combine selectedDate and time
      const datePart = selectedDate ? selectedDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      const timePart = newReservation.reservationTime || "12:00";
      const datetime = new Date(`${datePart}T${timePart}:00.000Z`).toISOString();

      const response = await fetch("/api/dashboard/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          configId: activeConfigId,
          ...newReservation,
          guestCount: parseInt(newReservation.guestCount),
          reservationTime: datetime
        })
      });
      const data = await response.json();
      if (data.success) {
        setReservations([...reservations, data.data]);
        setIsModalOpen(false);
        setNewReservation({
          guestName: "",
          guestEmail: "",
          guestPhone: "",
          guestCount: "2",
          reservationTime: "",
          specialRequests: "",
        });
      }
    } catch (error) {
      console.error("Failed to add reservation:", error);
    }
  };

  const filteredReservations = reservations.filter(r => {
    if (!selectedDate) return true;
    const rDate = new Date(r.reservationTime);
    return rDate.toDateString() === selectedDate.toDateString();
  });

  if (loading) {
    return <div className="p-8 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reservierungen</h2>
          <p className="text-muted-foreground">
            Verwalte Tischreservierungen und Buchungen.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={loadReservations}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Aktualisieren
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-teal-500 to-purple-500 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Neue Reservierung
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kalender</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Zusammenfassung ({selectedDate?.toLocaleDateString()})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gesamt</span>
                  <span className="font-bold">{filteredReservations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gäste</span>
                  <span className="font-bold">{filteredReservations.reduce((acc, r) => acc + r.guestCount, 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Reservierungen am {selectedDate?.toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredReservations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  Keine Reservierungen an diesem Datum.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReservations.map(res => (
                    <div key={res.id} className="p-4 border rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-teal-100 text-teal-800 p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px]">
                          <span className="text-sm font-bold">{new Date(res.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-xs">{res.guestCount} Gäste</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{res.guestName}</p>
                          <div className="text-sm text-gray-500 flex items-center gap-4">
                            {res.guestPhone && <span>📞 {res.guestPhone}</span>}
                            {res.guestEmail && <span>✉️ {res.guestEmail}</span>}
                          </div>
                          {res.specialRequests && (
                            <p className="text-xs mt-1 text-orange-600 bg-orange-50 inline-block px-2 py-1 rounded">
                              {res.specialRequests}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={res.status === 'CONFIRMED' ? 'default' : res.status === 'PENDING' ? 'outline' : 'secondary'} className={res.status === 'CONFIRMED' ? 'bg-green-500 hover:bg-green-600' : ''}>
                          {res.status}
                        </Badge>
                        <div className="flex gap-2">
                          {res.status !== 'CONFIRMED' && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => updateStatus(res.id, 'CONFIRMED')}>
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {res.status !== 'CANCELLED' && (
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus(res.id, 'CANCELLED')}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Reservierung hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name des Gastes</Label>
              <Input value={newReservation.guestName} onChange={e => setNewReservation({...newReservation, guestName: e.target.value})} placeholder="Max Mustermann" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Datum</Label>
                <Input type="date" value={selectedDate ? selectedDate.toISOString().split("T")[0] : ""} onChange={e => setSelectedDate(new Date(e.target.value))} />
              </div>
              <div>
                <Label>Uhrzeit</Label>
                <Input type="time" value={newReservation.reservationTime} onChange={e => setNewReservation({...newReservation, reservationTime: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Anzahl Gäste</Label>
                <Input type="number" min="1" value={newReservation.guestCount} onChange={e => setNewReservation({...newReservation, guestCount: e.target.value})} />
              </div>
              <div>
                <Label>Telefon (optional)</Label>
                <Input value={newReservation.guestPhone} onChange={e => setNewReservation({...newReservation, guestPhone: e.target.value})} placeholder="+49 ..." />
              </div>
            </div>
            <div>
              <Label>E-Mail (optional)</Label>
              <Input type="email" value={newReservation.guestEmail} onChange={e => setNewReservation({...newReservation, guestEmail: e.target.value})} placeholder="mail@beispiel.de" />
            </div>
            <div>
              <Label>Besondere Wünsche</Label>
              <Input value={newReservation.specialRequests} onChange={e => setNewReservation({...newReservation, specialRequests: e.target.value})} placeholder="z.B. Fensterplatz, Allergien" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleAddReservation} className="bg-gradient-to-r from-teal-500 to-purple-500 text-white">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
