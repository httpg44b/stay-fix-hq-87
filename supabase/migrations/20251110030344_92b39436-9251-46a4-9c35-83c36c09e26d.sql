-- Criar enum para categorias de tickets
CREATE TYPE public.ticket_category AS ENUM (
  'PLUMBING',
  'ELECTRICAL',
  'PAINTING',
  'CARPENTRY',
  'FLOORING',
  'FIRE_SAFETY',
  'OTHER'
);

-- Alterar a coluna category para usar o enum
-- Primeiro, atualizar valores existentes que possam ser NULL ou diferentes
UPDATE public.tickets 
SET category = 'OTHER' 
WHERE category IS NULL OR category NOT IN ('PLUMBING', 'ELECTRICAL', 'PAINTING', 'CARPENTRY', 'FLOORING', 'FIRE_SAFETY', 'OTHER');

-- Alterar o tipo da coluna
ALTER TABLE public.tickets 
ALTER COLUMN category TYPE public.ticket_category 
USING category::public.ticket_category;

-- Tornar a coluna NOT NULL e definir valor padrão
ALTER TABLE public.tickets 
ALTER COLUMN category SET NOT NULL,
ALTER COLUMN category SET DEFAULT 'OTHER'::public.ticket_category;