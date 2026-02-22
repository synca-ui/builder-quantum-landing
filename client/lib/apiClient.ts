import axios from "axios";

// WICHTIG: Hier holen wir die Railway-Adresse aus der Netlify-Umgebungsvariable.
// Falls wir lokal arbeiten (keine Variable), nutzen wir weiterhin "/api" (Proxy).
const baseURL = import.meta.env.VITE_API_URL || "/api";

export function createApiClient(getToken: () => Promise<string | null>) {
  const apiClient = axios.create({
    baseURL: baseURL, // <--- Hier nutzen wir jetzt die variable URL
    withCredentials: false,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  apiClient.interceptors.request.use(async (config) => {
    try {
      const token = await getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Error attaching auth token:", e);
    }
    return config;
  });

  return apiClient;
}

// Default instance without auth for non-authenticated requests
const apiClient = axios.create({
  baseURL: baseURL, // <--- Auch hier angepasst
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default apiClient;
