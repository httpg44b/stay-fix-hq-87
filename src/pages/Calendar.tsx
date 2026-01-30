import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, User, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TicketCategory, TicketPriority } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface CalendarTicket {
  id: string;
  title: string;
  hotel_name: string;
  technician_name: string;
  scheduled_date: string;
  priority: TicketPriority;
}

// Helper functions for French labels with first letter uppercase
const getCategoryLabel = (category: TicketCategory): string => {
  const labels: Record<TicketCategory, string> = {
    [TicketCategory.PLUMBING]: 'Plomberie & joints',
    [TicketCategory.ELECTRICAL]: 'Électricité',
    [TicketCategory.PAINTING]: 'Peinture & finitions',
    [TicketCategory.CARPENTRY]: 'Menuiserie',
    [TicketCategory.FLOORING]: 'Moquette & revêtements',
    [TicketCategory.FIRE_SAFETY]: 'Sécurité incendie',
    [TicketCategory.OTHER]: 'Autres',
  };
  return labels[category] || category;
};

const getPriorityLabel = (priority: TicketPriority): string => {
  const labels: Record<TicketPriority, string> = {
    [TicketPriority.LOW]: 'Basse',
    [TicketPriority.MEDIUM]: 'Moyenne',
    [TicketPriority.HIGH]: 'Haute',
    [TicketPriority.URGENT]: 'Urgente',
  };
  return labels[priority] || priority;
};

export default function Calendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedHotel, setSelectedHotel] = useState<string>('all');
  const [hotels, setHotels] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState<Date | null>(null);
  
  // Form state for new scheduled ticket
  const [newTicket, setNewTicket] = useState<{
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    hotel_id: string;
    room_number: string;
    scheduled_date: string;
  }>({
    title: '',
    description: '',
    category: TicketCategory.CARPENTRY,
    priority: TicketPriority.MEDIUM,
    hotel_id: '',
    room_number: '',
    scheduled_date: ''
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [hotelsData, ticketsData] = await Promise.all([
        hotelsService.getAll(),
        ticketsService.getScheduledTickets()
      ]);
      
      setHotels(hotelsData);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScheduledTicket = async () => {
    try {
      await ticketsService.create({
        ...newTicket,
        creator_id: user!.id,
        images: []
      });
      
      toast({
        title: 'Succès',
        description: 'Chamado agendado créé avec succès.',
      });
      
      setIsDialogOpen(false);
      setNewTicket({
        title: '',
        description: '',
        category: TicketCategory.CARPENTRY,
        priority: TicketPriority.MEDIUM,
        hotel_id: '',
        room_number: '',
        scheduled_date: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Error creating scheduled ticket:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le chamado agendado.',
        variant: 'destructive',
      });
    }
  };

  const getTicketsForDate = (date: Date): CalendarTicket[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tickets
      .filter(ticket => {
        if (!ticket.scheduled_date) return false;
        const ticketDate = format(new Date(ticket.scheduled_date), 'yyyy-MM-dd');
        if (selectedHotel !== 'all' && ticket.hotel_id !== selectedHotel) return false;
        return ticketDate === dateStr;
      })
      .map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        hotel_name: ticket.hotel?.name || '',
        technician_name: ticket.technician?.display_name || 'Non attribué',
        scheduled_date: ticket.scheduled_date,
        priority: ticket.priority
      }));
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days from previous month
    const startDay = getDay(start);
    const paddingDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const day = new Date(start);
      day.setDate(day.getDate() - i - 1);
      paddingDays.push(day);
    }
    
    // Add padding days from next month
    const endDay = getDay(end);
    const remainingDays = [];
    for (let i = 1; i <= (6 - endDay); i++) {
      const day = new Date(end);
      day.setDate(day.getDate() + i);
      remainingDays.push(day);
    }
    
    return [...paddingDays, ...days, ...remainingDays];
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const days = getDaysInMonth();

  const getTicketsForSelectedDate = () => {
    if (!viewingDate) return [];
    return getTicketsForDate(viewingDate);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CalendarDays className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Calendrier</h1>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold w-48 text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h2>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={handleToday}
                className="ml-2"
              >
                Aujourd'hui
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedHotel} onValueChange={setSelectedHotel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les hôtels</SelectItem>
                {hotels.map(hotel => (
                  <SelectItem key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Planifier un appel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Planifier un nouveau ticket</DialogTitle>
                  <DialogDescription>
                    Créez un nouveau ticket planifié pour une date spécifique.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hotel">Hôtel</Label>
                    <Select value={newTicket.hotel_id} onValueChange={(value) => setNewTicket({...newTicket, hotel_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un hôtel" />
                      </SelectTrigger>
                      <SelectContent>
                        {hotels.map(hotel => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduled_date">Date planifiée</Label>
                    <Input
                      type="date"
                      value={newTicket.scheduled_date}
                      onChange={(e) => setNewTicket({...newTicket, scheduled_date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input
                      value={newTicket.title}
                      onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                      placeholder="Titre du ticket"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="room_number">Numéro de chambre</Label>
                    <Input
                      value={newTicket.room_number}
                      onChange={(e) => setNewTicket({...newTicket, room_number: e.target.value})}
                      placeholder="Ex: 101"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <Select value={newTicket.category} onValueChange={(value) => setNewTicket({...newTicket, category: value as TicketCategory})}>
                      <SelectTrigger>
                        <SelectValue>
                          {newTicket.category ? getCategoryLabel(newTicket.category) : 'Sélectionner'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(TicketCategory).map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {getCategoryLabel(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Priorité</Label>
                    <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({...newTicket, priority: value as TicketPriority})}>
                      <SelectTrigger>
                        <SelectValue>
                          {newTicket.priority ? getPriorityLabel(newTicket.priority) : 'Sélectionner'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(TicketPriority).map(priority => (
                          <SelectItem key={priority} value={priority}>
                            {getPriorityLabel(priority)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                      placeholder="Description du problème"
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCreateScheduledTicket}
                    disabled={!newTicket.title || !newTicket.hotel_id || !newTicket.scheduled_date}
                    className="w-full"
                  >
                    Créer le ticket planifié
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex gap-4">
          <Card className="flex-1">
            <CardContent className="p-0 h-full">
              <div className="h-full flex flex-col">
                {/* Week days header */}
                <div className="grid grid-cols-7 border-b">
                  {weekDays.map((day, index) => (
                    <div
                      key={index}
                      className="p-3 text-center font-semibold text-sm text-muted-foreground border-r last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar days */}
                <div className="flex-1 grid grid-cols-7 grid-rows-6">
                  {days.map((day, index) => {
                    const dayTickets = getTicketsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[100px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors",
                          !isCurrentMonth && "bg-muted/20",
                          isToday && "bg-primary/5",
                          isSelected && "bg-primary/10 ring-2 ring-primary ring-inset"
                        )}
                        onClick={() => {
                          setSelectedDate(day);
                          setViewingDate(day);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-sm font-medium",
                            !isCurrentMonth && "text-muted-foreground",
                            isToday && "text-primary font-bold"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {dayTickets.length > 0 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {dayTickets.length}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          {dayTickets.slice(0, 3).map((ticket, i) => (
                            <div
                              key={ticket.id}
                              className={cn(
                                "text-xs p-1 rounded truncate",
                                ticket.priority === TicketPriority.URGENT ? "bg-destructive/10 text-destructive" :
                                ticket.priority === TicketPriority.HIGH ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" :
                                "bg-primary/10 text-primary"
                              )}
                              title={`${ticket.technician_name} - ${ticket.hotel_name}`}
                            >
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="truncate font-medium">{ticket.technician_name}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Building className="h-3 w-3" />
                                <span className="truncate">{ticket.hotel_name}</span>
                              </div>
                            </div>
                          ))}
                          {dayTickets.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{dayTickets.length - 3} plus...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side panel for selected date */}
          {viewingDate && (
            <Card className="w-96">
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(viewingDate, 'dd MMMM yyyy', { locale: fr })}
                </CardTitle>
                <CardDescription>
                  {getTicketsForSelectedDate().length} chamado(s) agendado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {getTicketsForSelectedDate().length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Aucun chamado pour cette date
                      </div>
                    ) : (
                      getTicketsForSelectedDate().map(ticket => (
                        <Card key={ticket.id} className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm">{ticket.title}</h4>
                              <Badge variant={
                                ticket.priority === TicketPriority.URGENT ? 'destructive' :
                                ticket.priority === TicketPriority.HIGH ? 'default' :
                                'secondary'
                              } className="text-xs">
                                {ticket.priority}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{ticket.technician_name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                <span>{ticket.hotel_name}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}