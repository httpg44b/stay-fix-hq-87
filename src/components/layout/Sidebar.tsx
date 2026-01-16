import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRole } from '@/lib/constants';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  PlusCircle,
  ClipboardList,
  Calendar,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const navigation = [
    {
      key: 'nav.dashboard',
      href: user.role === 'RECEPCAO' ? '/simple-dashboard' : '/dashboard',
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN, UserRole.TECNICO, UserRole.RECEPCAO]
    },
    {
      key: 'nav.newTicket',
      href: '/tickets/new',
      icon: PlusCircle,
      roles: [UserRole.RECEPCAO]
    },
    {
      key: 'nav.tickets',
      href: '/tickets',
      icon: Ticket,
      roles: [UserRole.ADMIN, UserRole.TECNICO, UserRole.RECEPCAO]
    },
    {
      key: 'nav.myTickets',
      href: '/my-tickets',
      icon: ClipboardList,
      roles: [UserRole.TECNICO]
    },
    {
      key: 'nav.calendar',
      href: '/calendar',
      icon: Calendar,
      roles: [UserRole.ADMIN]
    },
    {
      key: 'nav.checklists',
      href: '/checklists',
      icon: CheckSquare,
      roles: [UserRole.ADMIN, UserRole.TECNICO, UserRole.RECEPCAO]
    },
    {
      key: 'nav.users',
      href: '/admin/users',
      icon: Users,
      roles: [UserRole.ADMIN]
    },
    {
      key: 'nav.hotels',
      href: '/admin/hotels',
      icon: Building2,
      roles: [UserRole.ADMIN]
    },
    {
      key: 'nav.settings',
      href: '/settings',
      icon: Settings,
      roles: [UserRole.ADMIN, UserRole.TECNICO, UserRole.RECEPCAO]
    }
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out shadow-xl",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          <div className="flex h-24 items-center justify-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-600 rounded-lg blur-lg opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <img 
                src="/lovable-uploads/d37296f0-6138-4abe-80bc-5e3af6f143ca.png" 
                alt="MAJ TECH" 
                className="h-20 w-auto object-contain relative z-10 drop-shadow-lg"
              />
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-6 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-lg scale-[1.02]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:shadow-md hover:scale-[1.01]"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-white/20" 
                      : "bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600"
                  )}>
                    <item.icon className={cn(
                      "h-4 w-4",
                      isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
                    )} />
                  </div>
                  <span className="font-medium">{t(item.key)}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-6 bg-white/50 rounded-full animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-all duration-200"
              onClick={logout}
            >
              <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 mr-3">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="font-medium">{t('nav.logout')}</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};