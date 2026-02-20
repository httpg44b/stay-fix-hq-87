import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserRole, TicketStatus, TicketPriority, TicketCategory } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Plus, Eye, Download, Loader2, CalendarIcon, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { statusLabels, priorityLabels, categoryLabels } from '@/lib/constants';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';
import { useToast } from '@/hooks/use-toast';
import { TicketModal } from '@/components/TicketModal';
import { TechnicianName } from '@/components/TechnicianName';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx-js-style';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TicketList() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('not_completed');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [tickets, setTickets] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Load tickets based on user role
      let ticketData: any[] = [];
      if (user.role === UserRole.ADMIN) {
        // Admin can see all tickets
        ticketData = await ticketsService.getAll();
      } else if (user.role === UserRole.TECNICO || user.role === UserRole.RECEPCAO) {
        // Technicians and Reception see all tickets from their hotels
        const userHotels = await hotelsService.getUserHotels(user.id);
        const hotelIds = userHotels.map((uh: any) => uh.hotel_id);
        
        if (hotelIds.length > 0) {
          ticketData = await ticketsService.getHotelTickets(hotelIds);
        }
      } else {
        // Other users see only their created tickets (enforced by RLS)
        ticketData = await ticketsService.getMyTickets(user.id);
      }
      
      setTickets(ticketData);

      // Load hotels for filter
      if (user.role === UserRole.ADMIN) {
        const hotelData = await hotelsService.getAll();
        setHotels(hotelData);
      } else {
        const userHotels = await hotelsService.getUserHotels(user.id);
        setHotels(userHotels.map((uh: any) => uh.hotels));
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: t('errors.loadingData'),
        description: error.message || t('errors.loadingTickets'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  if (!user) return null;

  // Apply filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      (ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (ticket.room_number?.includes(searchTerm) || false) ||
      (ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = 
      statusFilter === 'all' 
        ? true 
        : statusFilter === 'not_completed' 
        ? ticket.status !== TicketStatus.COMPLETED 
        : ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesHotel = hotelFilter === 'all' || ticket.hotel_id === hotelFilter;
    
    // Date filter
    const ticketDate = new Date(ticket.created_at);
    const matchesDateFrom = !dateFrom || ticketDate >= dateFrom;
    const matchesDateTo = !dateTo || ticketDate <= new Date(dateTo.getTime() + 86400000 - 1); // Include entire day

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesHotel && matchesDateFrom && matchesDateTo;
  });

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

  const handleDeleteClick = (ticketId: string) => {
    setTicketToDelete(ticketId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ticketToDelete) return;

    try {
      await ticketsService.delete(ticketToDelete);
      toast({
        title: t('ticket.deleted'),
        description: t('ticket.deletedDesc'),
      });
      loadData();
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({
        title: t('errors.deletingTicket'),
        description: error.message || t('errors.deletingTicketDesc'),
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case TicketStatus.COMPLETED: return '228B22'; // green
      case TicketStatus.IN_PROGRESS: return '1E90FF'; // blue
      case TicketStatus.WAITING_PARTS: return 'FF8C00'; // orange
      case TicketStatus.NEW: return '8B0000'; // dark red
      case TicketStatus.SCHEDULED: return '9370DB'; // purple
      default: return '000000';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case TicketPriority.URGENT: return 'FF0000'; // red
      case TicketPriority.HIGH: return 'FF8C00'; // orange
      case TicketPriority.MEDIUM: return 'DAA520'; // goldenrod
      case TicketPriority.LOW: return '228B22'; // green
      default: return '000000';
    }
  };

  const exportDailyReport = () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);

      const completedToday = tickets.filter(ticket => {
        if (ticket.status !== TicketStatus.COMPLETED) return false;
        const closedAt = ticket.closed_at ? new Date(ticket.closed_at) : null;
        if (!closedAt) return false;
        return closedAt >= startOfDay && closedAt <= endOfDay;
      });

      if (completedToday.length === 0) {
        toast({
          title: 'Aucun ticket terminé aujourd\'hui',
          description: 'Il n\'y a aucun ticket terminé pour la date d\'aujourd\'hui.',
        });
        return;
      }

      const exportData = completedToday.map(ticket => ({
        'Chambre': ticket.room_number || '',
        'Titre': ticket.title || '',
        'Hôtel': hotels.find(h => h.id === ticket.hotel_id)?.name || '',
        'Catégorie': categoryLabels[ticket.category as TicketCategory] || ticket.category,
        'Statut': statusLabels[ticket.status as TicketStatus] || ticket.status,
        'Priorité': priorityLabels[ticket.priority as TicketPriority] || ticket.priority,
        'Technicien': ticket.assignee_id || 'Non attribué',
        'Description': ticket.description || '',
        'Solution': ticket.solution || '',
        'Créé le': ticket.created_at ? format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '',
        'Terminé le': ticket.closed_at ? format(new Date(ticket.closed_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      const statusColIndex = 4;
      const priorityColIndex = 5;

      completedToday.forEach((ticket, rowIdx) => {
        const row = rowIdx + 1;
        const statusCell = XLSX.utils.encode_cell({ r: row, c: statusColIndex });
        if (ws[statusCell]) {
          ws[statusCell].s = {
            font: { color: { rgb: getStatusColor(ticket.status) }, bold: true },
          };
        }
        const priorityCell = XLSX.utils.encode_cell({ r: row, c: priorityColIndex });
        if (ws[priorityCell]) {
          ws[priorityCell].s = {
            font: { color: { rgb: getPriorityColor(ticket.priority) }, bold: true },
          };
        }
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rapport du jour');

      const filename = `rapport_du_jour_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Rapport exporté',
        description: `${completedToday.length} ticket(s) terminé(s) aujourd'hui exporté(s) avec succès.`,
      });
    } catch (error: any) {
      console.error('Error exporting daily report:', error);
      toast({
        title: 'Erreur lors de l\'exportation',
        description: error.message || 'Impossible d\'exporter le rapport.',
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {t('nav.tickets')}
            </h1>
            <p className="text-muted-foreground">
              {t('tickets.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            {(user.role === UserRole.RECEPCAO || user.role === UserRole.ADMIN || user.role === UserRole.TECNICO) && (
              <Button onClick={() => navigate('/tickets/new')}>
                <Plus className="mr-2 h-4 w-4" />
                {t('tickets.newTicket')}
              </Button>
            )}
            <Button variant="outline" onClick={exportDailyReport}>
              <Download className="mr-2 h-4 w-4" />
              Rapport du jour
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t('tickets.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-2 md:col-span-2">
                <Label>{t('tickets.search')}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('tickets.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('tickets.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_completed">Tous (sauf terminé)</SelectItem>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('tickets.priority')}</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('ticket.category')}</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.all')} />
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
              </div>

              <div className="space-y-2">
                <Label>{t('tickets.dateFrom')}</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : t('common.select')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus={false}
                      locale={fr}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t('tickets.dateTo')}</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : t('common.select')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      disabled={(date) => dateFrom ? date < dateFrom : false}
                      initialFocus={false}
                      locale={fr}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(user.role === UserRole.ADMIN || user.hotels.length > 1) && (
                <div className="space-y-2">
                  <Label>{t('tickets.hotel')}</Label>
                  <Select value={hotelFilter} onValueChange={setHotelFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      {hotels.map((hotel: any) => (
                        <SelectItem key={hotel.id} value={hotel.id}>
                          {hotel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {(dateFrom || dateTo) && (
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                >
                  {t('tickets.clearDateFilter')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ticket.room')}</TableHead>
                  <TableHead>{t('ticket.title')}</TableHead>
                  <TableHead>{t('tickets.hotel')}</TableHead>
                  <TableHead>{t('tickets.status')}</TableHead>
                  <TableHead>{t('tickets.priority')}</TableHead>
                  <TableHead>{t('tickets.technician')}</TableHead>
                  <TableHead>{t('tickets.createdAt')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('tickets.noTickets')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket: any) => {
                    const hotelName = hotels.find(h => h.id === ticket.hotel_id)?.name || '-';
                    return (
                      <TableRow 
                        key={ticket.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTicketClick(ticket.id)}
                      >
                        <TableCell className="font-medium">
                          {ticket.room_number}
                        </TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>{hotelName}</TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell>
                          <TechnicianName assigneeId={ticket.assignee_id} />
                        </TableCell>
                        <TableCell>
                          {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTicketClick(ticket.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {user.role === UserRole.ADMIN && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(ticket.id);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </>
        )}
        
        <TicketModal
          ticketId={selectedTicketId}
          isOpen={modalOpen}
          onClose={handleModalClose}
          onUpdate={handleTicketUpdate}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('ticket.deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('ticket.deleteConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}