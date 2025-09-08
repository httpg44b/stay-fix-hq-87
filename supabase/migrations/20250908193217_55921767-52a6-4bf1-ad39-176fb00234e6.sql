-- 1) Enums para tickets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE public.ticket_status AS ENUM ('NEW','IN_PROGRESS','WAITING_PARTS','COMPLETED','CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE public.ticket_priority AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
  END IF;
END $$;

-- 2) Tabela de quartos (rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, number)
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 3) Tabela de chamados (tickets)
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_number text,
  title text NOT NULL,
  description text,
  category text,
  priority public.ticket_priority NOT NULL DEFAULT 'MEDIUM',
  status public.ticket_status NOT NULL DEFAULT 'NEW',
  creator_id text REFERENCES public.users(id),
  assignee_id text REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 4) Triggers de updated_at
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Políticas RLS
-- Rooms
DROP POLICY IF EXISTS rooms_admin_all ON public.rooms;
CREATE POLICY rooms_admin_all
ON public.rooms
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS rooms_users_select ON public.rooms;
CREATE POLICY rooms_users_select
ON public.rooms
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  hotel_id IN (
    SELECT uh.hotel_id FROM public.user_hotels uh
    WHERE uh.user_id = (auth.uid())::text
  )
);

-- Tickets
DROP POLICY IF EXISTS tickets_admin_all ON public.tickets;
CREATE POLICY tickets_admin_all
ON public.tickets
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS tickets_users_select ON public.tickets;
CREATE POLICY tickets_users_select
ON public.tickets
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  (hotel_id IN (
    SELECT uh.hotel_id FROM public.user_hotels uh
    WHERE uh.user_id = (auth.uid())::text
  )) OR
  (creator_id = (auth.uid())::text) OR
  (assignee_id = (auth.uid())::text)
);

DROP POLICY IF EXISTS tickets_users_insert ON public.tickets;
CREATE POLICY tickets_users_insert
ON public.tickets
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() OR
  (
    creator_id = (auth.uid())::text AND
    hotel_id IN (
      SELECT uh.hotel_id FROM public.user_hotels uh
      WHERE uh.user_id = (auth.uid())::text
    )
  )
);

DROP POLICY IF EXISTS tickets_users_update ON public.tickets;
CREATE POLICY tickets_users_update
ON public.tickets
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.is_admin() OR
  creator_id = (auth.uid())::text OR
  assignee_id = (auth.uid())::text
)
WITH CHECK (
  public.is_admin() OR
  (
    hotel_id IN (
      SELECT uh.hotel_id FROM public.user_hotels uh
      WHERE uh.user_id = (auth.uid())::text
    )
  )
);

-- 6) Índices
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON public.rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_tickets_hotel_id ON public.tickets(hotel_id);
CREATE INDEX IF NOT EXISTS idx_tickets_room_id ON public.tickets(room_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON public.tickets(creator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON public.tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);