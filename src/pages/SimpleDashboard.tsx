import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ticketsService } from '@/services/tickets.service';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Ticket, Clock, CheckCircle2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Ticket = Tables<'tickets'>;

export default function SimpleDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const data = await ticketsService.getAll();
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTickets = tickets.length;
  const inProgressTickets = tickets.filter(t => 
    t.status === 'IN_PROGRESS' || t.status === 'WAITING_PARTS'
  ).length;
  const completedTickets = tickets.filter(t => t.status === 'COMPLETED').length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Bon retour, {user?.display_name}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des Appels
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              1 nouveaux aujourd'hui
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En Cours
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{inProgressTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              14 en attente de pièces
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Terminés
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{completedTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
