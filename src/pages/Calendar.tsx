import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Plus, Clock, MapPin, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TicketCategory, TicketPriority } from '@/lib/constants';

export default function Calendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedHotel, setSelectedHotel] = useState<string>('all');
  const [hotels, setHotels] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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

  useEffect(() => {
    filterTickets();
  }, [tickets, selectedHotel, date]);

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
      
      if (hotelsData.length > 0 && selectedHotel === 'all') {
        setSelectedHotel(hotelsData[0].id);
      }
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

  const filterTickets = () => {
    let filtered = tickets;
    
    if (selectedHotel !== 'all') {
      filtered = filtered.filter(t => t.hotel_id === selectedHotel);
    }
    
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      filtered = filtered.filter(t => {
        if (!t.scheduled_date) return false;
        const ticketDate = format(new Date(t.scheduled_date), 'yyyy-MM-dd');
        return ticketDate === dateStr;
      });
    }
    
    setFilteredTickets(filtered);
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

  const getDatesWithTickets = () => {
    const datesSet = new Set<string>();
    tickets.forEach(ticket => {
      if (ticket.scheduled_date) {
        if (selectedHotel === 'all' || ticket.hotel_id === selectedHotel) {
          datesSet.add(format(new Date(ticket.scheduled_date), 'yyyy-MM-dd'));
        }
      }
    });
    return datesSet;
  };

  const datesWithTickets = getDatesWithTickets();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Calendrier des Chamados</h1>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Agendar Chamado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agendar Novo Chamado</DialogTitle>
                <DialogDescription>
                  Créez un nouveau chamado agendado pour une date spécifique.
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
                  <Label htmlFor="scheduled_date">Date Agendada</Label>
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
                    placeholder="Titre du chamado"
                  />
                </div>
                
                <div>
                  <Label htmlFor="room_number">Numéro de Chambre</Label>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TicketCategory).map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priorité</Label>
                  <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({...newTicket, priority: value as TicketPriority})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TicketPriority).map(priority => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
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
                  Créer Chamado Agendado
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Sélectionner Hôtel</CardTitle>
              <CardDescription>
                Filtrer les chamados par hôtel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger>
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
              
              <div className="mt-6">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    hasTickets: (date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      return datesWithTickets.has(dateStr);
                    }
                  }}
                  modifiersStyles={{
                    hasTickets: {
                      fontWeight: 'bold',
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      color: 'hsl(var(--primary))'
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Chamados Agendados
                {date && (
                  <span className="ml-2 text-muted-foreground">
                    - {format(date, 'dd MMMM yyyy', { locale: fr })}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {filteredTickets.length} chamado(s) agendado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun chamado agendado pour cette date
                    </div>
                  ) : (
                    filteredTickets.map(ticket => (
                      <Card key={ticket.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{ticket.title}</h3>
                              <Badge variant={
                                ticket.priority === TicketPriority.HIGH ? 'destructive' :
                                ticket.priority === TicketPriority.MEDIUM ? 'default' :
                                'secondary'
                              }>
                                {ticket.priority}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {ticket.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{ticket.hotel?.name}</span>
                              </div>
                              
                              {ticket.room_number && (
                                <div className="flex items-center gap-1">
                                  <span>Chambre {ticket.room_number}</span>
                                </div>
                              )}
                              
                              {ticket.scheduled_date && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {format(new Date(ticket.scheduled_date), 'dd/MM/yyyy')}
                                  </span>
                                </div>
                              )}
                              
                              {ticket.technician && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{ticket.technician.display_name}</span>
                                </div>
                              )}
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
        </div>
      </div>
    </AppLayout>
  );
}