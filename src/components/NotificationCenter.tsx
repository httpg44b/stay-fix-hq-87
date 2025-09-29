import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { notificationsService, type Notification } from '@/services/notifications.service';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function NotificationCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadNotifications();
    
    // Setup realtime subscription for notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const [notifData, unreadCountData] = await Promise.all([
        notificationsService.getMyNotifications(user.id),
        notificationsService.getUnreadCount(user.id)
      ]);
      
      setNotifications(notifData);
      setUnreadCount(unreadCountData);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      loadNotifications();
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer la notification comme lue.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await notificationsService.markAllAsRead(user.id);
      loadNotifications();
      toast({
        title: 'Succès',
        description: 'Toutes les notifications ont été marquées comme lues.',
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer toutes les notifications comme lues.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read and navigate to ticket
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    // Navigate to the ticket details page
    navigate(`/tickets`);
    // After navigation, scroll to the specific ticket
    setTimeout(() => {
      const ticketElement = document.querySelector(`[data-ticket-id="${notification.ticket_id}"]`);
      if (ticketElement) {
        ticketElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_assigned':
        return '🔧';
      case 'ticket_updated':
        return '📋';
      case 'ticket_commented':
        return '💬';
      default:
        return '📢';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-medium"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Marquer tout comme lu
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-accent/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <p className={`text-sm font-medium truncate ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), "dd/MM 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              className="w-full text-sm" 
              onClick={() => navigate('/notifications')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Voir toutes les notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}