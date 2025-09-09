import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface TechnicianNameProps {
  assigneeId?: string | null;
  inline?: boolean;
}

export function TechnicianName({ assigneeId, inline = false }: TechnicianNameProps) {
  const [technicianName, setTechnicianName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!assigneeId) {
      setTechnicianName(t('common.unassigned'));
      return;
    }

    const fetchTechnicianName = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_user_display_name', { _user_id: assigneeId });

        if (error) throw error;
        setTechnicianName(data || t('common.not_found'));
      } catch (error) {
        console.error('Error fetching technician name:', error);
        setTechnicianName(t('common.error_loading'));
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicianName();
  }, [assigneeId, t]);

  if (loading) {
    return inline ? (
      <span className="text-muted-foreground">{t('common.loading')}</span>
    ) : (
      <div className="text-muted-foreground">{t('common.loading')}</div>
    );
  }

  return inline ? (
    <span>{technicianName}</span>
  ) : (
    <div>{technicianName}</div>
  );
}