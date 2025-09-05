import { Badge } from '@/components/ui/badge';
import { TicketStatus } from '@/lib/constants';
import { statusLabels } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusStyles = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.NEW:
        return 'bg-status-new/10 text-status-new border-status-new/20';
      case TicketStatus.IN_PROGRESS:
        return 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/20';
      case TicketStatus.WAITING_PARTS:
        return 'bg-status-waiting/10 text-status-waiting border-status-waiting/20';
      case TicketStatus.COMPLETED:
        return 'bg-status-completed/10 text-status-completed border-status-completed/20';
      case TicketStatus.CANCELLED:
        return 'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20';
      default:
        return '';
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(getStatusStyles(status), 'font-medium', className)}
    >
      {statusLabels[status]}
    </Badge>
  );
};