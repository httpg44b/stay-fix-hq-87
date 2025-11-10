import { Badge } from '@/components/ui/badge';
import { TicketCategory } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CategoryBadgeProps {
  category: TicketCategory;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className }) => {
  const { t } = useLanguage();
  
  const getCategoryStyles = (category: TicketCategory) => {
    switch (category) {
      case TicketCategory.PLUMBING:
        return 'bg-category-plumbing/10 text-category-plumbing border-category-plumbing/20';
      case TicketCategory.ELECTRICAL:
        return 'bg-category-electrical/10 text-category-electrical border-category-electrical/20';
      case TicketCategory.PAINTING:
        return 'bg-category-painting/10 text-category-painting border-category-painting/20';
      case TicketCategory.CARPENTRY:
        return 'bg-category-carpentry/10 text-category-carpentry border-category-carpentry/20';
      case TicketCategory.FLOORING:
        return 'bg-category-flooring/10 text-category-flooring border-category-flooring/20';
      case TicketCategory.FIRE_SAFETY:
        return 'bg-category-fire-safety/10 text-category-fire-safety border-category-fire-safety/20';
      case TicketCategory.OTHER:
        return 'bg-category-other/10 text-category-other border-category-other/20';
      default:
        return '';
    }
  };

  const getCategoryLabel = (category: TicketCategory) => {
    const labels: Record<TicketCategory, string> = {
      [TicketCategory.PLUMBING]: 'Plomberie & Joints',
      [TicketCategory.ELECTRICAL]: 'Électricité',
      [TicketCategory.PAINTING]: 'Peinture & Finitions',
      [TicketCategory.CARPENTRY]: 'Menuiserie',
      [TicketCategory.FLOORING]: 'Moquette & Revêtements',
      [TicketCategory.FIRE_SAFETY]: 'Sécurité incendie',
      [TicketCategory.OTHER]: 'Autres'
    };
    return labels[category] || category;
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(getCategoryStyles(category), 'font-medium', className)}
    >
      {getCategoryLabel(category)}
    </Badge>
  );
};
