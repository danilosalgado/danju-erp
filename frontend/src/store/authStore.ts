import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  name: string | null;
  email: string | null;
  role: Role | null;
  isAuthenticated: boolean;

  login: (data: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    name: string;
    email: string;
    role: Role;
  }) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      name: null,
      email: null,
      role: null,
      isAuthenticated: false,

      login: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          name: null,
          email: null,
          role: null,
          isAuthenticated: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
    }),
    {
      name: 'danju-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userId: state.userId,
        name: state.name,
        email: state.email,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
