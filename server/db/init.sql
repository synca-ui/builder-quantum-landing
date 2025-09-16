-- Enable required extensions (works if available)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Web apps table
CREATE TABLE IF NOT EXISTS public.web_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subdomain varchar(63) UNIQUE NOT NULL,
  config_data jsonb NOT NULL,
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
