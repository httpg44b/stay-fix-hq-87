-- Add scheduled date field to tickets table
ALTER TABLE public.tickets 
ADD COLUMN scheduled_date date DEFAULT NULL;

-- Add index for better performance when querying by scheduled date
CREATE INDEX idx_tickets_scheduled_date ON public.tickets(scheduled_date);

-- Add index for hotel and scheduled date combination
CREATE INDEX idx_tickets_hotel_scheduled ON public.tickets(hotel_id, scheduled_date);