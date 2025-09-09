import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserRole, TicketStatus } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, AlertTriangle, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categoryLabels } from '@/lib/constants';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';
import { useToast } from '@/hooks/use-toast';

export default function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  if (!user || user.role !== UserRole.TECNICO) {
    navigate('/dashboard');
    return null;
  }

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // For technicians, get all tickets from their hotels
      const userHotels = await hotelsService.getUserHotels(user.id);
      const hotelIds = userHotels.map((uh: any) => uh.hotel_id);
      
      let data: any[] = [];
      if (hotelIds.length > 0) {
        data = await ticketsService.getHotelTickets(hotelIds);
      }
      
      setTickets(data);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Erro ao carregar chamados',
        description: error.message || 'Ocorreu um erro ao carregar os chamados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Unassigned tickets
  const unassignedTickets = tickets.filter(
    t => !t.assignee_id && 
    t.status === TicketStatus.NEW
  );

  // My assigned tickets
  const myTickets = tickets.filter(t => t.assignee_id === user.id);
  const activeTickets = myTickets.filter(
    t => t.status !== TicketStatus.COMPLETED && t.status !== TicketStatus.CANCELLED
  );
  const completedTickets = myTickets.filter(
    t => t.status === TicketStatus.COMPLETED || t.status === TicketStatus.CANCELLED
  );

  const handleAssignTicket = async (ticketId: string) => {
    try {
      await ticketsService.update(ticketId, {
        assignee_id: user.id,
        status: TicketStatus.IN_PROGRESS
      });
      toast({
        title: 'Chamado atribuído',
        description: 'O chamado foi atribuído a você com sucesso.',
      });
      loadTickets();
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Erro ao atribuir chamado',
        description: error.message || 'Ocorreu um erro ao atribuir o chamado.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Meus Chamados
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus chamados atribuídos
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Chamados Ativos
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-status-in-progress" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTickets.length}</div>
              <p className="text-xs text-muted-foreground">
                Em atendimento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Não Atribuídos
              </CardTitle>
              <Clock className="h-4 w-4 text-status-new" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unassignedTickets.length}</div>
              <p className="text-xs text-muted-foreground">
                Disponíveis para assumir
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Concluídos
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-status-completed" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTickets.length}</div>
              <p className="text-xs text-muted-foreground">
                Este mês
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unassigned">
              Não Atribuídos ({unassignedTickets.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Ativos ({activeTickets.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Concluídos ({completedTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unassigned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chamados Disponíveis</CardTitle>
                <CardDescription>
                  Chamados não atribuídos dos seus hotéis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {unassignedTickets.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      Nenhum chamado disponível para assumir
                    </p>
                  ) : (
                    unassignedTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{ticket.title}</p>
                            <PriorityBadge priority={ticket.priority} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Quarto {ticket.room_number}</span>
                            <span>{categoryLabels[ticket.category as keyof typeof categoryLabels]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAssignTicket(ticket.id)}
                          >
                            Assumir
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chamados Ativos</CardTitle>
                <CardDescription>
                  Chamados atualmente atribuídos a você
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeTickets.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      Nenhum chamado ativo
                    </p>
                  ) : (
                    activeTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{ticket.title}</p>
                            <StatusBadge status={ticket.status} />
                            <PriorityBadge priority={ticket.priority} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Quarto {ticket.room_number}</span>
                            <span>{categoryLabels[ticket.category as keyof typeof categoryLabels]}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chamados Concluídos</CardTitle>
                <CardDescription>
                  Histórico de chamados finalizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {completedTickets.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      Nenhum chamado concluído
                    </p>
                  ) : (
                    completedTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{ticket.title}</p>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Quarto {ticket.room_number}</span>
                            <span>
                              Concluído em {new Date(ticket.updated_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
    </AppLayout>
  );
}