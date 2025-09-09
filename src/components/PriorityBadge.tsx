import { Badge } from '@/components/ui/badge';
import { TicketPriority } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const { t } = useLanguage();
  
  const getPriorityStyles = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.LOW:
        return 'bg-priority-low/10 text-priority-low border-priority-low/20';
      case TicketPriority.MEDIUM:
        return 'bg-priority-medium/10 text-priority-medium border-priority-medium/20';
      case TicketPriority.HIGH:
        return 'bg-priority-high/10 text-priority-high border-priority-high/20';
      case TicketPriority.URGENT:
        return 'bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20';
      default:
        return '';
    }
  };

  const getPriorityLabel = (priority: TicketPriority) => {
    const priorityKeys: Record<TicketPriority, string> = {
      [TicketPriority.LOW]: 'priority.low',
      [TicketPriority.MEDIUM]: 'priority.medium',
      [TicketPriority.HIGH]: 'priority.high',
      [TicketPriority.URGENT]: 'priority.urgent',
    };
    return t(priorityKeys[priority]);
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(getPriorityStyles(priority), 'font-medium', className)}
    >
      {getPriorityLabel(priority)}
    </Badge>
  );
};