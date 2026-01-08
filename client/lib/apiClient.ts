import axios from "axios";

export function createApiClient(getToken: () => Promise<string | null>) {
  const apiClient = axios.create({
    baseURL: "/api",
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
  baseURL: "/api",
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default apiClient;
