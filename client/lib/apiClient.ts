import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("auth_token");
    // Check if token and headers object exist before setting the header
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // It's good practice to log potential errors
    console.error("Error setting auth token in interceptor", e);
  }
  return config;
});

export default apiClient;