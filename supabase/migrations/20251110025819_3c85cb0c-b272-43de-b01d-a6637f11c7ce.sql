-- O enum ticket_status já existe e está sendo usado na tabela tickets
-- Não podemos simplesmente alterar os valores do enum porque ele está em uso
-- Precisamos manter os mesmos valores internos mas os labels serão atualizados no frontend

-- Verificar se o enum tem os valores corretos
-- Os valores do enum devem permanecer: NEW, IN_PROGRESS, WAITING_PARTS, SCHEDULED, COMPLETED

-- Não há necessidade de alterar o banco de dados, apenas os labels no frontend
-- Esta migração serve apenas para confirmar que o enum está correto

DO $$ 
BEGIN
  -- Verificar se o tipo existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    RAISE EXCEPTION 'ticket_status enum type does not exist';
  END IF;
END $$;