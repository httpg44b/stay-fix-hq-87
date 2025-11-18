export const UserRole = {
  ADMIN: 'ADMIN',
  TECNICO: 'TECNICO',
  RECEPCAO: 'RECEPCAO'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const TicketStatus = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_PARTS: 'WAITING_PARTS',
  COMPLETED: 'COMPLETED',
  SCHEDULED: 'SCHEDULED'
} as const;

export type TicketStatus = typeof TicketStatus[keyof typeof TicketStatus];

export const TicketPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const;

export type TicketPriority = typeof TicketPriority[keyof typeof TicketPriority];

export const TicketCategory = {
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  PAINTING: 'PAINTING',
  CARPENTRY: 'CARPENTRY',
  FLOORING: 'FLOORING',
  FIRE_SAFETY: 'FIRE_SAFETY',
  OTHER: 'OTHER'
} as const;

export type TicketCategory = typeof TicketCategory[keyof typeof TicketCategory];

export const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: 'Nouveau',
  [TicketStatus.IN_PROGRESS]: 'Pris en charge',
  [TicketStatus.WAITING_PARTS]: 'En attente de livraison',
  [TicketStatus.SCHEDULED]: 'À planifier',
  [TicketStatus.COMPLETED]: 'Terminé'
};

export const priorityLabels: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Basse',
  [TicketPriority.MEDIUM]: 'Moyenne',
  [TicketPriority.HIGH]: 'Haute',
  [TicketPriority.URGENT]: 'Urgent'
};

export const categoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.PLUMBING]: 'Plomberie & Joints',
  [TicketCategory.ELECTRICAL]: 'Électricité',
  [TicketCategory.PAINTING]: 'Peinture & Finitions',
  [TicketCategory.CARPENTRY]: 'Menuiserie',
  [TicketCategory.FLOORING]: 'Moquette & Revêtements',
  [TicketCategory.FIRE_SAFETY]: 'Sécurité incendie',
  [TicketCategory.OTHER]: 'Autres'
};

export const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.TECNICO]: 'Técnico',
  [UserRole.RECEPCAO]: 'Recepção'
};