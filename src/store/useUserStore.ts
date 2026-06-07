import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, RoleType } from '@/types/models';
import { api } from '@/services/api';

interface UserState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkPermission: (permission: string) => boolean;
  checkRole: (roles: RoleType[]) => boolean;
}

const rolePermissions: Record<RoleType, string[]> = {
  admin: ['*'],
  supervisor: ['dashboard:view', 'alarm:*', 'inspection:*', 'hazard:*', 'construction:view', 'construction:approve', 'maintenance:view', 'maintenance:review', 'statistics:*', 'system:view'],
  operator: ['dashboard:view', 'alarm:view', 'alarm:handle', 'device:control', 'device:view'],
  inspector: ['inspection:view', 'inspection:checkin', 'hazard:report', 'hazard:rectify', 'hazard:view'],
  maintenance: ['maintenance:view', 'maintenance:execute', 'maintenance:complete'],
  pipelineUser: ['construction:apply', 'construction:view', 'construction:my'],
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,

      login: async (username: string, password: string) => {
        set({ loading: true });
        try {
          const user = await api.login(username, password);
          set({ user, token: 'mock-token-' + Date.now(), loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('user-storage');
      },

      setUser: (user) => set({ user }),

      checkPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        
        const permissions = rolePermissions[user.role] || [];
        if (permissions.includes('*')) return true;
        
        return permissions.some((p) => {
          if (p.endsWith(':*')) {
            return permission.startsWith(p.replace(':*', ''));
          }
          return p === permission;
        });
      },

      checkRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'user-storage',
    }
  )
);
