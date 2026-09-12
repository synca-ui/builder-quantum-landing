import {
  configurationApi,
  type ApiResponse,
  type Configuration,
} from "@/lib/api";

/** Antwort von POST /api/configurations, wenn die id niemandem (mehr) gehört. */
export const KONFIGURATION_NICHT_GEFUNDEN = "Configuration not found";

export interface SpeicherErgebnis {
  res: ApiResponse<Configuration>;
  /**
   * true, wenn die gemerkte id verworfen und die Konfiguration neu angelegt
   * wurde. Der Aufrufer muss dann die neue `res.data.id` übernehmen.
   */
  idVerworfen: boolean;
}

/**
 * Speichert eine Konfiguration und heilt eine verwaiste id.
 *
 * Die id liegt in localStorage. Meldet sich im selben Browser jemand mit einem
 * anderen Konto an, oder wurde die Konfiguration gelöscht, antwortet der
 * Server mit 404 „Configuration not found“ — und zwar bei JEDEM weiteren
 * Speichern, weil die id ja gespeichert bleibt. Genau dann wird die id
 * verworfen und einmal ohne id gespeichert, also neu angelegt.
 *
 * Nur diese eine Antwort löst das aus. Ein 403 (fremdes Business) oder ein
 * 400 (Validierung) bleibt ein Fehler; hier neu anzulegen würde das Problem
 * verstecken statt lösen.
 */
export async function konfigurationSpeichern(
  data: Partial<Configuration>,
  id: string | null | undefined,
  token: string,
  api: Pick<typeof configurationApi, "save"> = configurationApi,
): Promise<SpeicherErgebnis> {
  const erst = await api.save(id ? { ...data, id } : data, token);
  if (erst.success || !id || erst.error !== KONFIGURATION_NICHT_GEFUNDEN) {
    return { res: erst, idVerworfen: false };
  }
  const { id: _verworfen, ...ohneId } = data;
  const neu = await api.save(ohneId, token);
  return { res: neu, idVerworfen: true };
}
