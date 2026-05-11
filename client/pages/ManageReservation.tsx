import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, MessageSquare, CheckCircle, XCircle } from "lucide-react";

export default function ManageReservation() {
  const { id } = useParams();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    guestName: "",
    guestCount: 2,
    reservationTime: "",
    specialRequests: "",
  });

  useEffect(() => {
    fetchReservation();
  }, [id]);

  const fetchReservation = async () => {
    try {
      const res = await fetch(`/api/public/reservations/${id}`);
      const data = await res.json();
      if (data.success) {
        setReservation(data.data);
        setEditForm({
          guestName: data.data.guestName,
          guestCount: data.data.guestCount,
          reservationTime: new Date(data.data.reservationTime).toISOString().slice(0, 16),
          specialRequests: data.data.specialRequests || "",
        });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/reservations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          guestCount: Number(editForm.guestCount),
          reservationTime: new Date(editForm.reservationTime).toISOString(),
        })
      });
      const data = await res.json();
      if (data.success) {
        setReservation(data.data);
        setIsEditing(false);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Bist du sicher, dass du die Reservierung stornieren möchtest?")) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/public/reservations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      });
      const data = await res.json();
      if (data.success) {
        setReservation(data.data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !reservation) return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  if (error || !reservation) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || "Reservierung nicht gefunden."}</div>;

  const isEditable = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(reservation.status);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            {reservation.business?.name || "Restaurant"}
          </h1>
          <p className="mt-2 text-gray-600">Verwalte deine Reservierung</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className={`text-white rounded-t-lg ${reservation.status === 'CONFIRMED' ? 'bg-green-500' : reservation.status === 'CANCELLED' ? 'bg-red-500' : 'bg-yellow-500'}`}>
            <CardTitle className="flex items-center justify-between">
              <span>Status</span>
              <span className="capitalize">{reservation.status === 'PENDING' ? 'Ausstehend' : reservation.status === 'CONFIRMED' ? 'Bestätigt' : 'Storniert'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {!isEditing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-700">
                    <User className="w-5 h-5 mr-3 text-teal-500" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{reservation.guestName}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Users className="w-5 h-5 mr-3 text-teal-500" />
                    <div>
                      <p className="text-sm text-gray-500">Gästeanzahl</p>
                      <p className="font-medium">{reservation.guestCount} Personen</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700 md:col-span-2">
                    <Calendar className="w-5 h-5 mr-3 text-teal-500" />
                    <div>
                      <p className="text-sm text-gray-500">Datum & Uhrzeit</p>
                      <p className="font-medium">
                        {new Date(reservation.reservationTime).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" })} Uhr
                      </p>
                    </div>
                  </div>
                  {reservation.specialRequests && (
                    <div className="flex items-start text-gray-700 md:col-span-2">
                      <MessageSquare className="w-5 h-5 mr-3 text-teal-500 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">Besondere Wünsche</p>
                        <p className="font-medium bg-gray-100 p-2 rounded">{reservation.specialRequests}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Dein Name</Label>
                  <Input value={editForm.guestName} onChange={e => setEditForm({...editForm, guestName: e.target.value})} />
                </div>
                <div>
                  <Label>Gästeanzahl</Label>
                  <Input type="number" min="1" value={editForm.guestCount} onChange={e => setEditForm({...editForm, guestCount: parseInt(e.target.value)})} />
                </div>
                <div>
                  <Label>Datum & Uhrzeit</Label>
                  <Input type="datetime-local" value={editForm.reservationTime} onChange={e => setEditForm({...editForm, reservationTime: e.target.value})} />
                </div>
                <div>
                  <Label>Sonderwünsche</Label>
                  <Input value={editForm.specialRequests} onChange={e => setEditForm({...editForm, specialRequests: e.target.value})} />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between bg-gray-50 rounded-b-lg border-t p-6">
            {isEditable ? (
              !isEditing ? (
                <>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleCancel}>
                    Stornieren
                  </Button>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setIsEditing(true)}>
                    Ändern
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Abbrechen
                  </Button>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleUpdate} disabled={loading}>
                    Speichern
                  </Button>
                </>
              )
            ) : (
              <div className="w-full text-center text-gray-500 text-sm">
                Diese Reservierung kann nicht mehr geändert werden.
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
