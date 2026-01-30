import axios from "axios";

export async function publishWebApp(subdomain: string, config: any, token?: string) {
  try {
    const res = await axios.post(
      "/api/apps/publish",
      // WICHTIG: Sende ein Objekt mit den Keys 'subdomain' und 'config'
      { subdomain, config },
      {
        baseURL: "",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    return res.data;
  } catch (error) {
    console.error("Failed to publish web app:", error);
    throw error;
  }
}

export async function listMyApps(token?: string) {
  try {
    const res = await axios.get("/api/apps", {
      baseURL: "",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return (res.data as { apps: any[] }).apps;
  } catch (error) {
    console.error("Failed to list apps:", error);
    throw error;
  }
}

export async function getMyApp(id: string, token?: string) {
  try {
    const res = await axios.get(`/api/apps/${id}`, {
      baseURL: "",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.data as any;
  } catch (error) {
    console.error("Failed to get app:", error);
    throw error;
  }
}

export async function updateMyApp(id: string, config: any, token?: string) {
  try {
    const res = await axios.put(
      `/api/apps/${id}`,
      { config },
      {
        baseURL: "",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    return res.data as any;
  } catch (error) {
    console.error("Failed to update app:", error);
    throw error;
  }
}
