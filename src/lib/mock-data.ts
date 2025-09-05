import { User, Hotel, Ticket, TicketComment } from './types';
import { UserRole, TicketStatus, TicketPriority, TicketCategory } from './constants';

// Mock Hotels
export const mockHotels: Hotel[] = [
  {
    id: '1',
    name: 'Hotel Copacabana Palace',
    timezone: 'America/Sao_Paulo',
    address: 'Av. Atlântica, 1702 - Copacabana, Rio de Janeiro',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Hotel Unique',
    timezone: 'America/Sao_Paulo',
    address: 'Av. Brigadeiro Luís Antônio, 4700 - Jardim Paulista, São Paulo',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Belmond Hotel das Cataratas',
    timezone: 'America/Sao_Paulo',
    address: 'Rodovia Br 469, Km 32 - Foz do Iguaçu',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'admin@hotelfix.com',
    role: UserRole.ADMIN,
    hotels: [],
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@hotel1.com',
    role: UserRole.RECEPCAO,
    hotels: [mockHotels[0]],
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Carlos Oliveira',
    email: 'carlos@hotelfix.com',
    role: UserRole.TECNICO,
    hotels: [mockHotels[0], mockHotels[1]],
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '4',
    name: 'Ana Costa',
    email: 'ana@hotelfix.com',
    role: UserRole.TECNICO,
    hotels: [mockHotels[1], mockHotels[2]],
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '5',
    name: 'Pedro Almeida',
    email: 'pedro@hotel2.com',
    role: UserRole.RECEPCAO,
    hotels: [mockHotels[1]],
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

// Mock Tickets
export const mockTickets: Ticket[] = [
  {
    id: '1',
    hotelId: '1',
    hotel: mockHotels[0],
    roomNumber: '201',
    category: TicketCategory.HVAC,
    priority: TicketPriority.HIGH,
    title: 'Ar condicionado não funciona',
    description: 'O ar condicionado do quarto 201 não está ligando. Hóspede VIP no quarto.',
    status: TicketStatus.NEW,
    images: [],
    createdById: '2',
    createdBy: mockUsers[1],
    comments: [],
    createdAt: new Date('2024-12-27T10:00:00'),
    updatedAt: new Date('2024-12-27T10:00:00')
  },
  {
    id: '2',
    hotelId: '1',
    hotel: mockHotels[0],
    roomNumber: '305',
    category: TicketCategory.PLUMBING,
    priority: TicketPriority.URGENT,
    title: 'Vazamento no banheiro',
    description: 'Há um vazamento significativo embaixo da pia do banheiro.',
    status: TicketStatus.IN_PROGRESS,
    images: [],
    technicianId: '3',
    technician: mockUsers[2],
    createdById: '2',
    createdBy: mockUsers[1],
    comments: [
      {
        id: 'c1',
        ticketId: '2',
        userId: '3',
        user: mockUsers[2],
        content: 'Estou a caminho para verificar o problema.',
        statusChange: {
          from: TicketStatus.NEW,
          to: TicketStatus.IN_PROGRESS
        },
        createdAt: new Date('2024-12-27T10:30:00')
      }
    ],
    createdAt: new Date('2024-12-27T09:30:00'),
    updatedAt: new Date('2024-12-27T10:30:00')
  },
  {
    id: '3',
    hotelId: '2',
    hotel: mockHotels[1],
    roomNumber: '102',
    category: TicketCategory.ELECTRICAL,
    priority: TicketPriority.MEDIUM,
    title: 'Lâmpadas queimadas',
    description: 'Três lâmpadas do quarto estão queimadas e precisam ser substituídas.',
    status: TicketStatus.WAITING_PARTS,
    images: [],
    technicianId: '4',
    technician: mockUsers[3],
    createdById: '5',
    createdBy: mockUsers[4],
    comments: [],
    createdAt: new Date('2024-12-26T14:00:00'),
    updatedAt: new Date('2024-12-26T15:00:00')
  },
  {
    id: '4',
    hotelId: '2',
    hotel: mockHotels[1],
    roomNumber: '405',
    category: TicketCategory.CLEANING,
    priority: TicketPriority.LOW,
    title: 'Limpeza profunda necessária',
    description: 'O quarto precisa de uma limpeza profunda após check-out prolongado.',
    status: TicketStatus.COMPLETED,
    images: [],
    technicianId: '3',
    technician: mockUsers[2],
    createdById: '5',
    createdBy: mockUsers[4],
    comments: [],
    createdAt: new Date('2024-12-25T08:00:00'),
    updatedAt: new Date('2024-12-25T12:00:00')
  },
  {
    id: '5',
    hotelId: '1',
    hotel: mockHotels[0],
    roomNumber: '110',
    category: TicketCategory.IT,
    priority: TicketPriority.MEDIUM,
    title: 'WiFi não funciona',
    description: 'O roteador WiFi do quarto não está funcionando corretamente.',
    status: TicketStatus.NEW,
    images: [],
    createdById: '2',
    createdBy: mockUsers[1],
    comments: [],
    createdAt: new Date('2024-12-27T11:00:00'),
    updatedAt: new Date('2024-12-27T11:00:00')
  }
];

// Authentication mock
export const authenticateUser = (email: string, password: string): User | null => {
  const user = mockUsers.find(u => u.email === email);
  // For demo purposes, any password works
  if (user && password) {
    return user;
  }
  return null;
};