import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/constants';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle, AlertCircle, Users, Building } from 'lucide-react';
import { mockTickets, mockUsers, mockHotels } from '@/lib/mock-data';
import { TicketStatus } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Filter tickets based on user role
  const getFilteredTickets = () => {
    if (user.role === UserRole.ADMIN) {
      return mockTickets;
    } else if (user.role === UserRole.TECNICO) {
      return mockTickets.filter(t => 
        user.hotels.some(h => h.id === t.hotelId)
      );
    } else if (user.role === UserRole.RECEPCAO) {
      return mockTickets.filter(t => 
        user.hotels.some(h => h.id === t.hotelId)
      );
    }
    return [];
  };

  const tickets = getFilteredTickets();

  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === TicketStatus.NEW).length,
    inProgress: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
    waiting: tickets.filter(t => t.status === TicketStatus.WAITING_PARTS).length,
    completed: tickets.filter(t => t.status === TicketStatus.COMPLETED).length,
  };

  const myTickets = user.role === UserRole.TECNICO 
    ? tickets.filter(t => t.technicianId === user.id)
    : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta, {user.name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Chamados
              </CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.new} novos hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Em Atendimento
              </CardTitle>
              <Clock className="h-4 w-4 text-status-in-progress" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">
                {stats.waiting} aguardando peças
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
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Este mês
              </p>
            </CardContent>
          </Card>

          {user.role === UserRole.ADMIN && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Hotéis
                </CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockHotels.length}</div>
                <p className="text-xs text-muted-foreground">
                  {mockUsers.length} usuários ativos
                </p>
              </CardContent>
            </Card>
          )}

          {user.role === UserRole.TECNICO && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Meus Chamados
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myTickets.length}</div>
                <p className="text-xs text-muted-foreground">
                  Atribuídos a você
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Chamados Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.slice(0, 5).map((ticket) => (
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
                      {ticket.technician && (
                        <span>Técnico: {ticket.technician.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>

            {tickets.length > 5 && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/tickets')}
                >
                  Ver todos os chamados
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {user.role === UserRole.RECEPCAO && (
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button
                  className="h-20"
                  onClick={() => navigate('/tickets/new')}
                >
                  <Ticket className="mr-2 h-5 w-5" />
                  Novo Chamado
                </Button>
                <Button
                  variant="outline"
                  className="h-20"
                  onClick={() => navigate('/tickets')}
                >
                  <Clock className="mr-2 h-5 w-5" />
                  Ver Chamados Abertos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}