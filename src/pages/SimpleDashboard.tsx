import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ticketsService } from '@/services/tickets.service';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Ticket, Clock, CheckCircle2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { TechnicianName } from '@/components/TechnicianName';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type TicketType = Tables<'tickets'>;

export default function SimpleDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketType[]>([]);
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
  
  // Get 5 most recent tickets, excluding completed ones
  const recentTickets = tickets
    .filter(t => t.status !== 'COMPLETED')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

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

      {/* Recent Tickets Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Appels Récents</h2>
        <div className="space-y-3">
          {recentTickets.map((ticket) => (
            <Card 
              key={ticket.id} 
              className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => navigate('/tickets')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate mb-1">
                      {ticket.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{ticket.room_number ? `Chambre ${ticket.room_number}` : 'Sans chambre'}</span>
                      <span>•</span>
                      <span>{format(new Date(ticket.created_at), 'dd/MM/yyyy')}</span>
                      {ticket.assignee_id && (
                        <>
                          <span>•</span>
                          <span>Technicien: <TechnicianName assigneeId={ticket.assignee_id} inline /></span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {recentTickets.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Aucun appel récent</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* View All Tickets Button */}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => navigate('/tickets')}
        >
          Voir tous les appels
        </Button>
      </div>
    </AppLayout>
  );
}
