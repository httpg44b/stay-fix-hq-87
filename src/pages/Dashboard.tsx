import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, TicketStatus, TicketPriority, TicketCategory, statusLabels, priorityLabels, categoryLabels } from '@/lib/constants';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { ticketsService } from '@/services/tickets.service';
import { usersService } from '@/services/users.service';
import { hotelsService } from '@/services/hotels.service';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { TicketModal } from '@/components/TicketModal';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  
  // Modal
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!user) return null;

  useEffect(() => {
    loadData();
    
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      let ticketData: any[] = [];
      let userData: any[] = [];
      let hotelData: any[] = [];
      
      if (user.role === UserRole.ADMIN) {
        [ticketData, userData, hotelData] = await Promise.all([
          ticketsService.getAll(),
          usersService.getAll(),
          hotelsService.getAll()
        ]);
      } else {
        const userHotels = await hotelsService.getUserHotels(user.id);
        const hotelIds = userHotels.map((uh: any) => uh.hotel_id);
        
        if (hotelIds.length > 0) {
          ticketData = await ticketsService.getHotelTickets(hotelIds);
        }
        
        hotelData = await hotelsService.getAll();
        userData = await usersService.getAll();
      }
      
      setTickets(ticketData);
      setUsers(userData);
      setHotels(hotelData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur de chargement',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Date range
      if (dateRange.from && new Date(ticket.created_at) < dateRange.from) return false;
      if (dateRange.to && new Date(ticket.created_at) > dateRange.to) return false;
      
      // Hotels
      if (selectedHotels.length > 0 && !selectedHotels.includes(ticket.hotel_id)) return false;
      
      // Priorities
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(ticket.priority)) return false;
      
      // Statuses
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(ticket.status)) return false;
      
      // Categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(ticket.category)) return false;
      
      // Technicians
      if (selectedTechnicians.length > 0 && !selectedTechnicians.includes(ticket.assignee_id || '')) return false;
      
      // Search text
      if (searchText && !ticket.room_number?.toLowerCase().includes(searchText.toLowerCase())) return false;
      
      return true;
    });
  }, [tickets, dateRange, selectedHotels, selectedPriorities, selectedStatuses, selectedCategories, selectedTechnicians, searchText]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const completedTickets = filteredTickets.filter(t => t.status === TicketStatus.COMPLETED);
    const openTickets = filteredTickets.filter(t => t.status !== TicketStatus.COMPLETED);
    
    // Average resolution time
    const totalResolutionTime = completedTickets.reduce((sum, t) => {
      if (t.created_at && t.closed_at) {
        return sum + differenceInHours(new Date(t.closed_at), new Date(t.created_at));
      }
      return sum;
    }, 0);
    const avgResolutionTime = completedTickets.length > 0 ? totalResolutionTime / completedTickets.length : 0;
    
    // SLA (assuming 48h for normal, 24h for high, 12h for urgent)
    const withinSLA = completedTickets.filter(t => {
      if (!t.created_at || !t.closed_at) return false;
      const hours = differenceInHours(new Date(t.closed_at), new Date(t.created_at));
      if (t.priority === TicketPriority.URGENT) return hours <= 12;
      if (t.priority === TicketPriority.HIGH) return hours <= 24;
      return hours <= 48;
    }).length;
    const slaPercentage = completedTickets.length > 0 ? (withinSLA / completedTickets.length) * 100 : 0;
    
    // High priority percentage
    const highPriorityCount = filteredTickets.filter(t => 
      t.priority === TicketPriority.URGENT || t.priority === TicketPriority.HIGH
    ).length;
    const highPriorityPercentage = filteredTickets.length > 0 ? (highPriorityCount / filteredTickets.length) * 100 : 0;
    
    // Scheduled tickets
    const scheduledCount = filteredTickets.filter(t => t.status === TicketStatus.SCHEDULED).length;
    
    return {
      total: filteredTickets.length,
      open: openTickets.length,
      avgResolutionTime: Math.round(avgResolutionTime),
      slaPercentage: Math.round(slaPercentage),
      highPriorityPercentage: Math.round(highPriorityPercentage),
      scheduledCount
    };
  }, [filteredTickets]);

  // Charts data
  const chartData = useMemo(() => {
    // Tickets by hotel
    const byHotel = hotels.map(hotel => ({
      name: hotel.name,
      tickets: filteredTickets.filter(t => t.hotel_id === hotel.id).length
    }));

    // Categories by hotel
    const categoriesByHotel = hotels.map(hotel => {
      const hotelTickets = filteredTickets.filter(t => t.hotel_id === hotel.id);
      const result: any = { name: hotel.name };
      Object.keys(TicketCategory).forEach(cat => {
        result[categoryLabels[cat as TicketCategory]] = hotelTickets.filter(t => t.category === cat).length;
      });
      return result;
    });

    // Avg resolution time by priority
    const completedTickets = filteredTickets.filter(t => t.status === TicketStatus.COMPLETED);
    const avgByPriority = Object.keys(TicketPriority).map(priority => {
      const tickets = completedTickets.filter(t => t.priority === priority);
      const total = tickets.reduce((sum, t) => {
        if (t.created_at && t.closed_at) {
          return sum + differenceInHours(new Date(t.closed_at), new Date(t.created_at));
        }
        return sum;
      }, 0);
      return {
        name: priorityLabels[priority as TicketPriority],
        hours: tickets.length > 0 ? Math.round(total / tickets.length) : 0
      };
    });

    // SLA by priority
    const slaByPriority = Object.keys(TicketPriority).map(priority => {
      const tickets = completedTickets.filter(t => t.priority === priority);
      const withinSLA = tickets.filter(t => {
        if (!t.created_at || !t.closed_at) return false;
        const hours = differenceInHours(new Date(t.closed_at), new Date(t.created_at));
        if (priority === TicketPriority.URGENT) return hours <= 12;
        if (priority === TicketPriority.HIGH) return hours <= 24;
        return hours <= 48;
      }).length;
      return {
        name: priorityLabels[priority as TicketPriority],
        percentage: tickets.length > 0 ? Math.round((withinSLA / tickets.length) * 100) : 0
      };
    });

    // Avg resolution time by hotel
    const avgByHotel = hotels.map(hotel => {
      const tickets = completedTickets.filter(t => t.hotel_id === hotel.id);
      const total = tickets.reduce((sum, t) => {
        if (t.created_at && t.closed_at) {
          return sum + differenceInHours(new Date(t.closed_at), new Date(t.created_at));
        }
        return sum;
      }, 0);
      return {
        name: hotel.name,
        hours: tickets.length > 0 ? Math.round(total / tickets.length) : 0
      };
    });

    // Created vs completed over time (simplified by week)
    const createdByDate: any = {};
    const completedByDate: any = {};
    
    filteredTickets.forEach(t => {
      const week = format(new Date(t.created_at), 'yyyy-ww', { locale: fr });
      createdByDate[week] = (createdByDate[week] || 0) + 1;
      
      if (t.closed_at) {
        const closeWeek = format(new Date(t.closed_at), 'yyyy-ww', { locale: fr });
        completedByDate[closeWeek] = (completedByDate[closeWeek] || 0) + 1;
      }
    });
    
    const allWeeks = [...new Set([...Object.keys(createdByDate), ...Object.keys(completedByDate)])].sort();
    const flowData = allWeeks.map(week => ({
      name: week,
      created: createdByDate[week] || 0,
      completed: completedByDate[week] || 0
    }));

    // Backlog by age
    const openTickets = filteredTickets.filter(t => t.status !== TicketStatus.COMPLETED);
    const backlogByAge = hotels.map(hotel => {
      const hotelOpen = openTickets.filter(t => t.hotel_id === hotel.id);
      const result: any = { name: hotel.name };
      
      hotelOpen.forEach(t => {
        const days = differenceInDays(new Date(), new Date(t.created_at));
        if (days <= 1) result['0-24h'] = (result['0-24h'] || 0) + 1;
        else if (days <= 3) result['1-3j'] = (result['1-3j'] || 0) + 1;
        else if (days <= 7) result['3-7j'] = (result['3-7j'] || 0) + 1;
        else result['>7j'] = (result['>7j'] || 0) + 1;
      });
      
      return result;
    });

    // Top 10 rooms
    const roomCounts: any = {};
    filteredTickets.forEach(t => {
      if (t.room_number) {
        roomCounts[t.room_number] = (roomCounts[t.room_number] || 0) + 1;
      }
    });
    const topRooms = Object.entries(roomCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10)
      .map(([room, count]) => ({ name: room, tickets: count }));

    // Technician productivity
    const technicianTickets = users.filter(u => u.role === UserRole.TECNICO).map(tech => ({
      name: tech.display_name,
      completed: completedTickets.filter(t => t.assignee_id === tech.id).length
    }));

    const technicianAvgTime = users.filter(u => u.role === UserRole.TECNICO).map(tech => {
      const tickets = completedTickets.filter(t => t.assignee_id === tech.id);
      const total = tickets.reduce((sum, t) => {
        if (t.created_at && t.closed_at) {
          return sum + differenceInHours(new Date(t.closed_at), new Date(t.created_at));
        }
        return sum;
      }, 0);
      return {
        name: tech.display_name,
        hours: tickets.length > 0 ? Math.round(total / tickets.length) : 0
      };
    });

    return {
      byHotel,
      categoriesByHotel,
      avgByPriority,
      slaByPriority,
      avgByHotel,
      flowData,
      backlogByAge,
      topRooms,
      technicianTickets,
      technicianAvgTime
    };
  }, [filteredTickets, hotels, users]);

  // Table data with calculated fields
  const tableData = useMemo(() => {
    return filteredTickets.map(ticket => {
      const resolutionTime = ticket.closed_at && ticket.created_at 
        ? differenceInHours(new Date(ticket.closed_at), new Date(ticket.created_at))
        : null;
      
      const withinSLA = ticket.closed_at && ticket.created_at ? (() => {
        const hours = differenceInHours(new Date(ticket.closed_at), new Date(ticket.created_at));
        if (ticket.priority === TicketPriority.URGENT) return hours <= 12;
        if (ticket.priority === TicketPriority.HIGH) return hours <= 24;
        return hours <= 48;
      })() : null;
      
      return {
        ...ticket,
        hotelName: hotels.find(h => h.id === ticket.hotel_id)?.name || '',
        technicianName: users.find(u => u.id === ticket.assignee_id)?.display_name || 'Non assigné',
        resolutionTimeFormatted: resolutionTime ? `${Math.floor(resolutionTime / 24)}j ${resolutionTime % 24}h` : '-',
        withinSLA: withinSLA === null ? '-' : withinSLA ? 'Oui' : 'Non'
      };
    });
  }, [filteredTickets, hotels, users]);

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Tableau de bord – Maintenance Hôtels
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Vue d'ensemble complète des opérations de maintenance
          </p>
        </div>

        {/* Filters Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres globaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-xs md:text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
                      ) : format(dateRange.from, 'dd/MM/yy')
                    ) : (
                      <span>Période</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Hotel */}
              <Select onValueChange={(value) => setSelectedHotels(value === 'all' ? [] : [value])}>
                <SelectTrigger>
                  <SelectValue placeholder="Hôtel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {hotels.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority */}
              <Select onValueChange={(value) => setSelectedPriorities(value === 'all' ? [] : [value])}>
                <SelectTrigger>
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select onValueChange={(value) => setSelectedStatuses(value === 'all' ? [] : [value])}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category */}
              <Select onValueChange={(value) => setSelectedCategories(value === 'all' ? [] : [value])}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Technician */}
              <Select onValueChange={(value) => setSelectedTechnicians(value === 'all' ? [] : [value])}>
                <SelectTrigger>
                  <SelectValue placeholder="Technicien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {users.filter(u => u.role === UserRole.TECNICO).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => {
                setDateRange({ from: undefined, to: undefined });
                setSelectedHotels([]);
                setSelectedPriorities([]);
                setSelectedStatuses([]);
                setSelectedCategories([]);
                setSelectedTechnicians([]);
              }}
            >
              Réinitialiser les filtres
            </Button>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{kpis.total}</div>
              <p className="text-xs text-muted-foreground">tickets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">En cours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{kpis.open}</div>
              <p className="text-xs text-muted-foreground">ouverts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Temps moy.</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{kpis.avgResolutionTime}h</div>
              <p className="text-xs text-muted-foreground">résolution</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">SLA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{kpis.slaPercentage}%</div>
              <p className="text-xs text-muted-foreground">respecté</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Priorité haute</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{kpis.highPriorityPercentage}%</div>
              <p className="text-xs text-muted-foreground">urgent + haute</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">À planifier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{kpis.scheduledCount}</div>
              <p className="text-xs text-muted-foreground">tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Visão por Hotel & Categoria */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Tickets par hôtel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.byHotel}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Catégories par hôtel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.categoriesByHotel}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {Object.values(categoryLabels).map((label, i) => (
                    <Bar key={label} dataKey={label} stackId="a" fill={`hsl(${(i * 360) / 7}, 65%, 55%)`} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tempo & SLA */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Temps moy. par priorité</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.avgByPriority}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="hsl(var(--status-in-progress))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">% SLA par priorité</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.slaByPriority}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="percentage" fill="hsl(var(--status-completed))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Temps moy. par hôtel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.avgByHotel}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Backlog & Fluxo */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Créés vs Terminés</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.flowData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="created" name="Créés" stroke="hsl(var(--status-new))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="completed" name="Terminés" stroke="hsl(var(--status-completed))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Backlog par ancienneté</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.backlogByAge}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="0-24h" stackId="a" fill="hsl(142, 71%, 45%)" />
                  <Bar dataKey="1-3j" stackId="a" fill="hsl(48, 96%, 53%)" />
                  <Bar dataKey="3-7j" stackId="a" fill="hsl(25, 95%, 53%)" />
                  <Bar dataKey=">7j" stackId="a" fill="hsl(0, 84%, 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top 10 Quartos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Top 10 chambres/zones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.topRooms} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Produtividade Técnicos */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Tickets terminés par technicien</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.technicianTickets}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completed" name="Terminés" fill="hsl(var(--status-completed))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Temps moy. par technicien</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.technicianAvgTime}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="hours" name="Heures" fill="hsl(var(--status-in-progress))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela Detalhada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Liste détaillée des tickets</CardTitle>
            <Input
              placeholder="Rechercher par numéro de chambre..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="max-w-sm text-sm"
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">Ticket</TableHead>
                    <TableHead className="text-xs md:text-sm">Hôtel</TableHead>
                    <TableHead className="text-xs md:text-sm">Chambre</TableHead>
                    <TableHead className="text-xs md:text-sm">Catégorie</TableHead>
                    <TableHead className="text-xs md:text-sm">Priorité</TableHead>
                    <TableHead className="text-xs md:text-sm">Statut</TableHead>
                    <TableHead className="text-xs md:text-sm">Technicien</TableHead>
                    <TableHead className="text-xs md:text-sm">Créé</TableHead>
                    <TableHead className="text-xs md:text-sm">Terminé</TableHead>
                    <TableHead className="text-xs md:text-sm">Temps</TableHead>
                    <TableHead className="text-xs md:text-sm">SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map(ticket => (
                    <TableRow 
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleTicketClick(ticket.id)}
                    >
                      <TableCell className="font-medium text-xs md:text-sm">{ticket.title}</TableCell>
                      <TableCell className="text-xs md:text-sm">{ticket.hotelName}</TableCell>
                      <TableCell className="text-xs md:text-sm">{ticket.room_number}</TableCell>
                      <TableCell><CategoryBadge category={ticket.category} /></TableCell>
                      <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell><StatusBadge status={ticket.status} /></TableCell>
                      <TableCell className="text-xs md:text-sm">{ticket.technicianName}</TableCell>
                      <TableCell className="text-xs md:text-sm">{format(new Date(ticket.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell className="text-xs md:text-sm">{ticket.closed_at ? format(new Date(ticket.closed_at), 'dd/MM/yy HH:mm') : '-'}</TableCell>
                      <TableCell className="text-xs md:text-sm">{ticket.resolutionTimeFormatted}</TableCell>
                      <TableCell>
                        {ticket.withinSLA === 'Oui' && <Badge variant="outline" className="bg-status-completed/10 text-xs">Oui</Badge>}
                        {ticket.withinSLA === 'Non' && <Badge variant="outline" className="bg-destructive/10 text-xs">Non</Badge>}
                        {ticket.withinSLA === '-' && <span className="text-xs">-</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <TicketModal
        ticketId={selectedTicketId}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTicketId(null);
        }}
        onUpdate={loadData}
      />
    </AppLayout>
  );
}
