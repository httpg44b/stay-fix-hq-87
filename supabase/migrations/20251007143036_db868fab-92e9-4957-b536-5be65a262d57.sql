-- Remover o default temporariamente
ALTER TABLE public.tickets ALTER COLUMN status DROP DEFAULT;

-- Criar novo enum com os valores atualizados
CREATE TYPE ticket_status_new AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'SCHEDULED');

-- Atualizar a coluna status para usar o novo tipo, convertendo CANCELLED para SCHEDULED
ALTER TABLE public.tickets 
  ALTER COLUMN status TYPE ticket_status_new 
  USING (
    CASE 
      WHEN status::text = 'CANCELLED' THEN 'SCHEDULED'::ticket_status_new
      ELSE status::text::ticket_status_new
    END
  );

-- Remover o tipo antigo
DROP TYPE ticket_status;

-- Renomear o novo tipo para o nome original
ALTER TYPE ticket_status_new RENAME TO ticket_status;

-- Restaurar o default com o novo valor
ALTER TABLE public.tickets ALTER COLUMN status SET DEFAULT 'NEW'::ticket_status;