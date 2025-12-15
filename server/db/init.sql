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
