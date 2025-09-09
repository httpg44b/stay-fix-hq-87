import { User } from '@/services/users.service';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserCheck, UserX } from 'lucide-react';

interface HotelUsersListProps {
  users: User[];
  selectedUsers: string[];
  onToggleUser: (userId: string, selected: boolean) => void;
}

export function HotelUsersList({ users, selectedUsers, onToggleUser }: HotelUsersListProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-2">
        {users.map((user) => {
          const isSelected = selectedUsers.includes(user.id);
          return (
            <div
              key={user.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                ${isSelected ? 'bg-accent border-primary' : 'hover:bg-accent/50'}`}
              onClick={() => onToggleUser(user.id, !isSelected)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1 rounded-full ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isSelected ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                </div>
                <div>
                  <div className="font-medium">{user.display_name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{user.role}</Badge>
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}