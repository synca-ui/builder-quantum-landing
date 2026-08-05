import { request } from "../http";
import type {
  CreateVenueInput,
  DailyBriefing,
  DailyTask,
  Reservation,
  ServiceDay,
  Venue,
} from "../types";

/**
 * Endpunkt-Wrapper. Dünne Schicht über `request()` - keine UI-Logik, kein State.
 * Web und Mobile rufen dieselben Funktionen auf.
 */

export const briefing = {
  /** Tagesbriefing für den Start-Screen ("Guten Morgen, Café Goldstück"). */
  today(venueId: string, signal?: AbortSignal) {
    return request<DailyBriefing>("/briefing/today", { query: { venueId }, signal });
  },

  /** Aufgabe freigeben (Bewertung antworten, Beitrag einplanen). */
  approveTask(taskId: string) {
    return request<DailyTask>(`/briefing/tasks/${taskId}/approve`, { method: "POST" });
  },

  /** Entwurf vor der Freigabe anpassen. */
  updateDraft(taskId: string, draft: string) {
    return request<DailyTask>(`/briefing/tasks/${taskId}`, {
      method: "PATCH",
      body: { draft },
    });
  },
};

export const reservations = {
  /** Tischbelegung eines Servicetags. */
  day(venueId: string, date: string, signal?: AbortSignal) {
    return request<ServiceDay>("/reservations/day", { query: { venueId, date }, signal });
  },

  create(input: {
    venueId: string;
    guestName: string;
    partySize: number;
    start: string;
    phone?: string;
  }) {
    return request<Reservation>("/reservations", { method: "POST", body: input });
  },

  /** Walk-in direkt am Tisch eintragen. */
  walkIn(input: { venueId: string; tableId: string; partySize: number }) {
    return request<Reservation>("/reservations/walk-in", { method: "POST", body: input });
  },

  cancel(reservationId: string) {
    return request<void>(`/reservations/${reservationId}`, { method: "DELETE" });
  },
};

export const venues = {
  mine() {
    return request<Venue[]>("/venues");
  },

  /**
   * Den ersten eigenen Betrieb anlegen. Der Schritt zwischen "angemeldet" und
   * "sieht eigene Daten": Ohne Betrieb liefert `mine()` eine leere Liste und jeder
   * betriebsgebundene Aufruf endet in 403.
   *
   * Antwortet mit 201 und dem angelegten Betrieb. ZWEI Fälle, die der Aufrufer
   * behandeln sollte - beide kommen als `ApiError`:
   *  - 409: Es gibt schon einen Betrieb. Ein zweiter ist bewusst nicht möglich
   *    (Begründung an der Route in server/maitr/routes.ts). Der vorhandene liegt
   *    dann in `error.body.venue` - ein Doppeltipp muss also keine Sackgasse sein.
   *  - 422: Der Name taugt nicht als Adresse; nach einem anderen Namen fragen.
   */
  create(input: CreateVenueInput) {
    return request<Venue>("/venues", { method: "POST", body: input });
  },

  /** Oeffentliches Gast-Profil - ohne Anmeldung erreichbar. */
  publicProfile(slug: string, signal?: AbortSignal) {
    return request<Venue>(`/venues/${slug}/public`, { anonymous: true, signal });
  },
};

export { ApiError } from "../http";
