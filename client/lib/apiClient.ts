import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any)["Authorization"] = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

export default apiClient;
