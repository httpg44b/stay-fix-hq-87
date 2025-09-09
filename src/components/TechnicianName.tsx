import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TechnicianNameProps {
  assigneeId?: string | null;
  inline?: boolean;
}

export function TechnicianName({ assigneeId, inline = false }: TechnicianNameProps) {
  const [technicianName, setTechnicianName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assigneeId) {
      setTechnicianName('Não atribuído');
      return;
    }

    const fetchTechnicianName = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_user_display_name', { _user_id: assigneeId });

        if (error) throw error;
        setTechnicianName(data || 'Técnico não encontrado');
      } catch (error) {
        console.error('Error fetching technician name:', error);
        setTechnicianName('Erro ao carregar');
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicianName();
  }, [assigneeId]);

  if (loading) {
    return inline ? (
      <span className="text-muted-foreground">Carregando...</span>
    ) : (
      <div className="text-muted-foreground">Carregando...</div>
    );
  }

  return inline ? (
    <span>{technicianName}</span>
  ) : (
    <div>{technicianName}</div>
  );
}