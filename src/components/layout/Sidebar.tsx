import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/constants';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building,
  Settings,
  LogOut,
  Menu,
  X,
  PlusCircle,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN, UserRole.TECNICO, UserRole.RECEPCAO]
    },
    {
      name: 'Novo Chamado',
      href: '/tickets/new',
      icon: PlusCircle,
      roles: [UserRole.RECEPCAO]
    },
    {
      name: 'Chamados',
      href: '/tickets',
      icon: Ticket,
      roles: [UserRole.ADMIN, UserRole.TECNICO, UserRole.RECEPCAO]
    },
    {
      name: 'Meus Chamados',
      href: '/my-tickets',
      icon: ClipboardList,
      roles: [UserRole.TECNICO]
    },
    {
      name: 'Usuários',
      href: '/users',
      icon: Users,
      roles: [UserRole.ADMIN]
    },
    {
      name: 'Hotéis',
      href: '/hotels',
      icon: Building,
      roles: [UserRole.ADMIN]
    },
    {
      name: 'Configurações',
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
        "fixed md:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center border-b border-border bg-gradient-header">
            <h1 className="text-xl font-display font-bold text-primary-foreground">
              HotelFix
            </h1>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
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