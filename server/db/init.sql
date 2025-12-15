-- Enable required extensions (works if available)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  full_name varchar(255),
  company_name varchar(255),
  profile_image_url text,
  phone varchar(20),
  subscription_tier varchar(50) DEFAULT 'free',
  subscription_status varchar(50) DEFAULT 'active',
  credits_used int DEFAULT 0,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Web apps table
CREATE TABLE IF NOT EXISTS public.web_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subdomain varchar(63) UNIQUE NOT NULL,
  config_data jsonb NOT NULL,
  source_url text,
  auto_generated_at timestamptz,
  ai_metadata jsonb,
  asset_storage_location text,
  privacy_compliant boolean DEFAULT false,
  has_schema boolean DEFAULT false,
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_apps_user_id_updated ON public.web_apps(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_apps_has_schema ON public.web_apps(has_schema);

-- AI Job Tracking (for n8n workflow orchestration)
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  web_app_id uuid REFERENCES public.web_apps(id) ON DELETE SET NULL,
  source_url text,
  status varchar(50) DEFAULT 'pending', -- pending, processing, completed, failed
  job_id varchar(255), -- n8n workflow job ID
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id_status ON public.ai_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_web_app_id ON public.ai_jobs(web_app_id);

-- Generated Schema Cache (for JSON-LD outputs)
CREATE TABLE IF NOT EXISTS public.ai_generated_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  web_app_id uuid NOT NULL REFERENCES public.web_apps(id) ON DELETE CASCADE,
  schema_data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);

CREATE INDEX IF NOT EXISTS idx_ai_generated_schemas_expires ON public.ai_generated_schemas(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_generated_schemas_web_app ON public.ai_generated_schemas(web_app_id);

-- Order Events (for Social Proof & Real-time Order Tracking)
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  web_app_id uuid NOT NULL REFERENCES public.web_apps(id) ON DELETE CASCADE,
  order_id varchar(255) NOT NULL,
  menu_item_id varchar(255),
  menu_item_name varchar(255),
  ordered_at timestamptz DEFAULT now(),
  order_source varchar(50), -- 'stripe', 'pos_api', 'manual'
  user_avatar_url text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_events_web_app_ordered_at ON public.order_events(web_app_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
