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
  HVAC: 'HVAC',
  ELECTRICAL: 'ELECTRICAL',
  PLUMBING: 'PLUMBING',
  CARPENTRY: 'CARPENTRY',
  CLEANING: 'CLEANING',
  IT: 'IT',
  OTHER: 'OTHER'
} as const;

export type TicketCategory = typeof TicketCategory[keyof typeof TicketCategory];

export const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: 'Novo',
  [TicketStatus.IN_PROGRESS]: 'Em Atendimento',
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
  [TicketCategory.HVAC]: 'Ar Condicionado',
  [TicketCategory.ELECTRICAL]: 'Elétrica',
  [TicketCategory.PLUMBING]: 'Hidráulica',
  [TicketCategory.CARPENTRY]: 'Marcenaria',
  [TicketCategory.CLEANING]: 'Limpeza',
  [TicketCategory.IT]: 'TI',
  [TicketCategory.OTHER]: 'Outros'
};

export const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.TECNICO]: 'Técnico',
  [UserRole.RECEPCAO]: 'Recepção'
};