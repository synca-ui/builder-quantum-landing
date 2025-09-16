import apiClient from "@/lib/apiClient";

export async function publishWebApp(subdomain: string, config: any) {
  const res = await apiClient.post("/apps/publish", { subdomain, config });
  return res.data as { id: string; user_id: string; subdomain: string; config_data: any; published_at: string; updated_at: string; publishedUrl?: string; previewUrl?: string };
}

export async function listMyApps() {
  const res = await apiClient.get("/apps");
  return (res.data as { apps: any[] }).apps;
}

export async function getMyApp(id: string) {
  const res = await apiClient.get(`/apps/${id}`);
  return res.data as any;
}

export async function updateMyApp(id: string, config: any) {
  const res = await apiClient.put(`/apps/${id}`, { config });
  return res.data as any;
}
