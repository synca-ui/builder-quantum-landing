export interface N8nBranding {
  logo_url?: string;
  primary_color?: string;
}

export interface N8nAnalysis {
  maitr_score: number;
  recommendation?: string; // e.g. 'full_auto' | 'manual'
}

export interface N8nRestaurant {
  name: string;
}

export interface N8nResult {
  restaurant: N8nRestaurant;
  branding?: N8nBranding;
  analysis: N8nAnalysis;
}
