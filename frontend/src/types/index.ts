export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Role = 'ADMIN' | 'GERENTE' | 'CAIXA' | 'ESTOQUISTA' | 'FINANCEIRO';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  CAIXA: 'Caixa',
  ESTOQUISTA: 'Estoquista',
  FINANCEIRO: 'Financeiro',
};

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: Role;
  active?: boolean;
}
