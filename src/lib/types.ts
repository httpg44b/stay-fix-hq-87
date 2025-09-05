import { UserRole, TicketStatus, TicketPriority, TicketCategory } from './constants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hotels: Hotel[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Hotel {
  id: string;
  name: string;
  timezone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  hotelId: string;
  hotel?: Hotel;
  roomNumber: string;
  category: TicketCategory;
  priority: TicketPriority;
  title: string;
  description: string;
  status: TicketStatus;
  images: string[];
  technicianId?: string;
  technician?: User;
  createdById: string;
  createdBy?: User;
  comments: TicketComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  user?: User;
  content: string;
  images?: string[];
  statusChange?: {
    from: TicketStatus;
    to: TicketStatus;
  };
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}