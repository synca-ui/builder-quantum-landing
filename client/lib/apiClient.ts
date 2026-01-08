import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Note: Token attachment for Clerk is now handled by individual API calls
// using getToken() from @clerk/clerk-react. Axios interceptor is left minimal
// to avoid circular dependencies with React hooks.

export default apiClient;
