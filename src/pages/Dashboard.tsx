import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRole, TicketCategory } from '@/lib/constants';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle, AlertCircle, Users, Building, Loader2 } from 'lucide-react';
import { TicketStatus } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ticketsService } from '@/services/tickets.service';
import { usersService } from '@/services/users.service';
import { hotelsService } from '@/services/hotels.service';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TicketModal } from '@/components/TicketModal';
import { TechnicianName } from '@/components/TechnicianName';
import { categoryLabels } from '@/lib/constants';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (!user) return null;

  useEffect(() => {
    loadData();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          // Reload data when tickets change
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load tickets based on user role
      let ticketData: any[] = [];
      if (user.role === UserRole.ADMIN) {
        ticketData = await ticketsService.getAll();
      } else if (user.role === UserRole.TECNICO) {
        // For technicians, get all tickets from their hotels
        const userHotels = await hotelsService.getUserHotels(user.id);
        const hotelIds = userHotels.map((uh: any) => uh.hotel_id);
        
        if (hotelIds.length > 0) {
          ticketData = await ticketsService.getHotelTickets(hotelIds);
        }
      } else if (user.role === UserRole.RECEPCAO) {
        // Reception sees all tickets from their hotels (like technicians)
        const userHotels = await hotelsService.getUserHotels(user.id);
        const hotelIds = userHotels.map((uh: any) => uh.hotel_id);
        
        if (hotelIds.length > 0) {
          ticketData = await ticketsService.getHotelTickets(hotelIds);
        }
      }
      
      setTickets(ticketData);

      // Load users and hotels for admin
      if (user.role === UserRole.ADMIN) {
        const [userData, hotelData] = await Promise.all([
          usersService.getAll(),
          hotelsService.getAll()
        ]);
        setUsers(userData);
        setHotels(hotelData);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: t('errors.loadingData'),
        description: error.message || t('errors.loadingDataDesc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === TicketStatus.NEW).length,
    inProgress: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
    waiting: tickets.filter(t => t.status === TicketStatus.WAITING_PARTS).length,
    completed: tickets.filter(t => t.status === TicketStatus.COMPLETED).length,
  };

  // Filter out completed tickets for display
  const activeTickets = tickets
    .filter(t => t.status !== TicketStatus.COMPLETED)
    .filter(t => categoryFilter === 'all' || t.category === categoryFilter);

  const myTickets = user.role === UserRole.TECNICO 
    ? tickets.filter(t => t.assignee_id === user.id)
    : [];

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTicketId(null);
  };

  const handleTicketUpdate = () => {
    loadData(); // Reload tickets after update
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
            {t('nav.dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.welcome')}, {user.name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.total_tickets')}
              </CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.new} {t('dashboard.new_today')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.in_progress')}
              </CardTitle>
              <Clock className="h-4 w-4 text-status-in-progress" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">
                {stats.waiting} {t('dashboard.waiting_parts')}
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
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.this_month')}
              </p>
            </CardContent>
          </Card>

          {user.role === UserRole.ADMIN && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('dashboard.total_hotels')}
                </CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hotels.length}</div>
                <p className="text-xs text-muted-foreground">
                  {users.length} {t('dashboard.active_users')}
                </p>
              </CardContent>
            </Card>
          )}

          {user.role === UserRole.TECNICO && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('nav.myTickets')}
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myTickets.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.assignedToYou')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Category Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="categoryFilter" className="whitespace-nowrap">{t('ticket.category')}</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="categoryFilter" className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={value as TicketCategory} />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  {t('tickets.clearFilter')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recent_tickets')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTickets.slice(0, 5).map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleTicketClick(ticket.id)}
                >
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="font-medium truncate">{ticket.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">{t('ticket.room')} {ticket.room_number}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                       {ticket.assignee_id && (
                         <>
                           <span className="hidden sm:inline">•</span>
                           <span className="truncate">{t('tickets.technician')}: <TechnicianName assigneeId={ticket.assignee_id} inline /></span>
                         </>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {activeTickets.length > 5 && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/tickets')}
                >
                  {t('tickets.viewAll')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technician's All Tickets from Hotels */}
        {user.role === UserRole.TECNICO && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('dashboard.allTicketsHotels')}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tickets')}
              >
                {t('tickets.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeTickets.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    {t('tickets.noTickets')}
                  </p>
                ) : (
                  activeTickets.slice(0, 10).map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleTicketClick(ticket.id)}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <p className="font-medium truncate">{ticket.title}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={ticket.status} />
                            <PriorityBadge priority={ticket.priority} />
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">{t('ticket.room')} {ticket.room_number}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                            {ticket.assignee_id && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className={`truncate ${ticket.assignee_id === user.id ? "text-primary font-medium" : ""}`}>
                                  {ticket.assignee_id === user.id ? `✓ ${t('dashboard.assignedToYou')}` : t('tickets.assigned')}
                                </span>
                              </>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="self-end sm:self-auto mt-2 sm:mt-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${ticket.id}`);
                            }}
                          >
                            {t('common.view')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {user.role === UserRole.RECEPCAO && (
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button
                  className="h-20"
                  onClick={() => navigate('/tickets/new')}
                >
                  <Ticket className="mr-2 h-5 w-5" />
                  {t('tickets.newTicket')}
                </Button>
                <Button
                  variant="outline"
                  className="h-20"
                  onClick={() => navigate('/tickets')}
                >
                  <Clock className="mr-2 h-5 w-5" />
                  {t('dashboard.openTickets')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </>
        )}
        
        <TicketModal
          ticketId={selectedTicketId}
          isOpen={modalOpen}
          onClose={handleModalClose}
          onUpdate={handleTicketUpdate}
        />
      </div>
    </AppLayout>
  );
}