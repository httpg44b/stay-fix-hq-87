import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { roleLabels, UserRole } from '@/lib/constants';
import { Bell, User, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { hotelsService } from '@/services/hotels.service';
import { NotificationCenter } from '@/components/NotificationCenter';

export const Header = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const [userHotel, setUserHotel] = useState<string | null>(null);

  useEffect(() => {
    const loadUserHotel = async () => {
      if (user && user.role === UserRole.RECEPCAO) {
        try {
          const hotels = await hotelsService.getUserHotels(user.id);
          if (hotels.length > 0) {
            setUserHotel(hotels[0].hotels.name);
          }
        } catch (error) {
          console.error('Error loading user hotel:', error);
        }
      }
    };
    loadUserHotel();
  }, [user]);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-4 md:ml-0 ml-12">
          <h2 className="text-lg font-semibold text-foreground">
            {user.hotels.length > 0 ? user.hotels[0].name : 'MAJ TECH'}
          </h2>
          <Badge variant="secondary">
            {roleLabels[user.role]}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                {resolvedTheme === 'dark' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                {t('settings.themeLight')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                {t('settings.themeDark')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                {t('settings.themeSystem')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  {userHotel && user.role === UserRole.RECEPCAO && (
                    <p className="text-xs text-muted-foreground font-medium">{userHotel}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={logout}
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};