import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, Users, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { formatiereInZone, STANDARD_ZONE, wanduhrFeldIn, zeitpunktAusWanduhrFeld } from "@maitr/core/zeitzone";

/**
 * Uhrzeiten dieser Seite sind Wanduhr des BETRIEBS, nicht des Browsers und nicht
 * UTC. ANLASS (15.09.2026): Das Feld wurde mit `toISOString().slice(0, 16)`
 * belegt (19:00 Köln stand als 17:00 da), und `handleUpdate` schickte die Zeit
 * bei JEDEM Speichern mit, im Browser gelesen - wer nur die Personenzahl
 * änderte, rückte die Buchung zwei Stunden nach vorn.
 */
function zoneDer(reservation: any): string {
  return reservation?.business?.timezone || STANDARD_ZONE;
}

function formularAus(reservation: any) {
  return {
    guestName: reservation.guestName,
    guestCount: reservation.guestCount,
    reservationTime: wanduhrFeldIn(new Date(reservation.reservationTime), zoneDer(reservation)),
    specialRequests: reservation.specialRequests || "",
  };
}

export default function ManageReservation() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  // Signierter Zugriffstoken aus dem Mail-Link (siehe gastZugriffErlaubt in
  // server/routes/publicReservations.ts) - ohne ihn lehnt der Server GET/PUT ab.
  const token = searchParams.get("t");
  const tokenQuery = token ? `?t=${encodeURIComponent(token)}` : "";
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
      const res = await fetch(`/api/public/reservations/${id}${tokenQuery}`);
      const data = await res.json();
      if (data.success) {
        setReservation(data.data);
        setEditForm(formularAus(data.data));
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
    // Zeit nur schicken, wenn der Gast sie wirklich geändert hat - verglichen
    // mit genau dem Wert, mit dem das Feld vorbelegt wurde.
    const { reservationTime: feldZeit, ...rest } = editForm;
    const zeitGeaendert = feldZeit !== formularAus(reservation).reservationTime;
    const neueZeit = zeitGeaendert ? zeitpunktAusWanduhrFeld(feldZeit, zoneDer(reservation)) : null;
    if (zeitGeaendert && !neueZeit) {
      alert("Bitte gib Datum und Uhrzeit vollständig an.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/public/reservations/${id}${tokenQuery}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          guestCount: Number(editForm.guestCount),
          ...(neueZeit ? { reservationTime: neueZeit.toISOString() } : {}),
        })
      });
      const data = await res.json();
      if (data.success) {
        setReservation(data.data);
        setEditForm(formularAus(data.data));
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
      const res = await fetch(`/api/public/reservations/${id}${tokenQuery}`, {
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
                        {formatiereInZone(new Date(reservation.reservationTime), zoneDer(reservation), { dateStyle: "full", timeStyle: "short" })} Uhr
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
                  <Button
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => {
                      // Frisch aus dem gespeicherten Stand: Ein abgebrochener
                      // Entwurf darf beim nächsten Speichern nicht mitreisen.
                      setEditForm(formularAus(reservation));
                      setIsEditing(true);
                    }}
                  >
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
