import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserRole, TicketStatus, TicketPriority } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
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
import { Search, Filter, Plus, Eye, Download, Loader2, CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { statusLabels, priorityLabels } from '@/lib/constants';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';
import { useToast } from '@/hooks/use-toast';
import { TicketModal } from '@/components/TicketModal';
import { TechnicianName } from '@/components/TechnicianName';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function TicketList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [tickets, setTickets] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!user) return null;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load tickets based on user role
      let ticketData: any[] = [];
      if (user.role === UserRole.ADMIN) {
        // Admin can see all tickets
        ticketData = await ticketsService.getAll();
      } else if (user.role === UserRole.TECNICO) {
        // Technicians see all tickets from their hotels
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
        title: 'Erro ao carregar dados',
        description: error.message || 'Ocorreu um erro ao carregar os chamados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      (ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (ticket.room_number?.includes(searchTerm) || false) ||
      (ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesHotel = hotelFilter === 'all' || ticket.hotel_id === hotelFilter;
    
    // Date filter
    const ticketDate = new Date(ticket.created_at);
    const matchesDateFrom = !dateFrom || ticketDate >= dateFrom;
    const matchesDateTo = !dateTo || ticketDate <= new Date(dateTo.getTime() + 86400000 - 1); // Include entire day

    return matchesSearch && matchesStatus && matchesPriority && matchesHotel && matchesDateFrom && matchesDateTo;
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

  const exportToCSV = () => {
    // Implement CSV export
    console.log('Exporting to CSV...');
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
              Chamados
            </h1>
            <p className="text-muted-foreground">
              Gerencie todos os chamados de manutenção
            </p>
          </div>
          <div className="flex gap-2">
            {user.role === UserRole.RECEPCAO && (
              <Button onClick={() => navigate('/tickets/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Chamado
              </Button>
            )}
            {user.role === UserRole.ADMIN && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-2 md:col-span-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, quarto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      disabled={(date) => dateFrom ? date < dateFrom : false}
                      initialFocus
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(user.role === UserRole.ADMIN || user.hotels.length > 1) && (
                <div className="space-y-2">
                  <Label>Hotel</Label>
                  <Select value={hotelFilter} onValueChange={setHotelFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
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
                  Limpar filtro de data
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
                  <TableHead>Quarto</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum chamado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket: any) => {
                    const hotelName = hotels.find(h => h.id === ticket.hotel_id)?.name || '-';
                    return (
                      <TableRow key={ticket.id}>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTicketClick(ticket.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
      </div>
    </AppLayout>
  );
}