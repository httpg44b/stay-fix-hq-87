-- Create users table with required fields
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','TECNICO','RECEPCAO')),
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_self_select" ON public.users;
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;

-- Admin can do everything on users
CREATE POLICY "users_admin_all"
  ON public.users
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'ADMIN')
  WITH CHECK (true);

-- Users can read their own row
CREATE POLICY "users_self_select"
  ON public.users
  FOR SELECT
  USING (id = auth.uid()::text);

-- Users can insert their own row
CREATE POLICY "users_self_insert"
  ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid()::text);

-- Users can update their own row
CREATE POLICY "users_self_update"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);