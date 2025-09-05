import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockTickets } from '@/lib/mock-data';
import { UserRole, TicketStatus } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categoryLabels } from '@/lib/constants';

export default function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');

  if (!user || user.role !== UserRole.TECNICO) {
    navigate('/dashboard');
    return null;
  }

  // Unassigned tickets from user's hotels
  const unassignedTickets = mockTickets.filter(
    t => !t.technicianId && 
    t.status === TicketStatus.NEW &&
    user.hotels.some(h => h.id === t.hotelId)
  );

  // My assigned tickets
  const myTickets = mockTickets.filter(t => t.technicianId === user.id);
  const activeTickets = myTickets.filter(
    t => t.status !== TicketStatus.COMPLETED && t.status !== TicketStatus.CANCELLED
  );
  const completedTickets = myTickets.filter(
    t => t.status === TicketStatus.COMPLETED || t.status === TicketStatus.CANCELLED
  );

  const handleAssignTicket = (ticketId: string) => {
    // In a real app, this would make an API call
    console.log('Assigning ticket:', ticketId);
    navigate(`/tickets/${ticketId}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
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
                            <span>Quarto {ticket.roomNumber}</span>
                            <span>{ticket.hotel?.name}</span>
                            <span>{categoryLabels[ticket.category]}</span>
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
                            <span>Quarto {ticket.roomNumber}</span>
                            <span>{ticket.hotel?.name}</span>
                            <span>{categoryLabels[ticket.category]}</span>
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
                            <span>Quarto {ticket.roomNumber}</span>
                            <span>{ticket.hotel?.name}</span>
                            <span>
                              Concluído em {new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}
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
      </div>
    </AppLayout>
  );
}