import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  if (!user || (user.role !== UserRole.TECNICO && user.role !== UserRole.RECEPCAO)) {
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
        title: t('errors.loadingTickets'),
        description: error.message || t('errors.loadingTicketsDesc'),
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
    t => t.status !== TicketStatus.COMPLETED && t.status !== TicketStatus.SCHEDULED
  );
  const completedTickets = myTickets.filter(
    t => t.status === TicketStatus.COMPLETED || t.status === TicketStatus.SCHEDULED
  );

  const handleAssignTicket = async (ticketId: string) => {
    try {
      await ticketsService.update(ticketId, {
        assignee_id: user.id,
        status: TicketStatus.IN_PROGRESS
      });
      toast({
        title: t('ticket.assigned'),
        description: t('ticket.assignedSuccess'),
      });
      loadTickets();
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      toast({
        title: t('errors.assigningTicket'),
        description: error.message || t('errors.assigningTicketDesc'),
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
            {t('nav.myTickets')}
          </h1>
          <p className="text-muted-foreground">
            {t('myTickets.subtitle')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('myTickets.activeTickets')}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-status-in-progress" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTickets.length}</div>
              <p className="text-xs text-muted-foreground">
                {t('myTickets.inProgress')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('myTickets.unassigned')}
              </CardTitle>
              <Clock className="h-4 w-4 text-status-new" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unassignedTickets.length}</div>
              <p className="text-xs text-muted-foreground">
                {t('myTickets.availableToTake')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.completed')}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-status-completed" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTickets.length}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.this_month')}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unassigned">
              {t('myTickets.unassigned')} ({unassignedTickets.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              {t('myTickets.active')} ({activeTickets.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t('myTickets.completed')} ({completedTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unassigned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('myTickets.availableTickets')}</CardTitle>
                <CardDescription>
                  {t('myTickets.unassignedFromHotels')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {unassignedTickets.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      {t('myTickets.noAvailableTickets')}
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
                            <span>{t('ticket.room')} {ticket.room_number}</span>
                            <span>{t(`category.${ticket.category.toLowerCase()}`)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t('common.view')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAssignTicket(ticket.id)}
                          >
                            {t('myTickets.take')}
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
                <CardTitle>{t('myTickets.activeTickets')}</CardTitle>
                <CardDescription>
                  {t('myTickets.currentlyAssignedToYou')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeTickets.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      {t('myTickets.noActiveTickets')}
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
                            <span>{t('ticket.room')} {ticket.room_number}</span>
                            <span>{t(`category.${ticket.category.toLowerCase()}`)}</span>
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
                <CardTitle>{t('myTickets.completedTickets')}</CardTitle>
                <CardDescription>
                  {t('myTickets.historyFinalized')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {completedTickets.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      {t('myTickets.noCompletedTickets')}
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
                            <span>{t('ticket.room')} {ticket.room_number}</span>
                            <span>
                              {t('myTickets.completedOn')} {new Date(ticket.updated_at).toLocaleDateString('pt-BR')}
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