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
  CANCELLED: 'CANCELLED'
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
  CARPENTRY: 'CARPENTRY',
  PAINTING: 'PAINTING',
  FLOORING: 'FLOORING',
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  OTHER: 'OTHER'
} as const;

export type TicketCategory = typeof TicketCategory[keyof typeof TicketCategory];

export const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: 'Novo',
  [TicketStatus.IN_PROGRESS]: 'En service',
  [TicketStatus.WAITING_PARTS]: 'Aguardando Peça',
  [TicketStatus.COMPLETED]: 'Concluído',
  [TicketStatus.CANCELLED]: 'Cancelado'
};

export const priorityLabels: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Baixa',
  [TicketPriority.MEDIUM]: 'Média',
  [TicketPriority.HIGH]: 'Alta',
  [TicketPriority.URGENT]: 'Urgente'
};

export const categoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.CARPENTRY]: 'Menuiserie & Bois',
  [TicketCategory.PAINTING]: 'Peinture & Finitions',
  [TicketCategory.FLOORING]: 'Moquette & Revêtements',
  [TicketCategory.PLUMBING]: 'Plomberie',
  [TicketCategory.ELECTRICAL]: 'Électricité',
  [TicketCategory.OTHER]: 'Autres'
};

export const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.TECNICO]: 'Técnico',
  [UserRole.RECEPCAO]: 'Recepção'
};