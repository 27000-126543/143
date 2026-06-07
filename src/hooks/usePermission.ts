import { useUserStore } from '@/store/useUserStore';
import type { RoleType } from '@/types/models';

export const usePermission = () => {
  const { user, checkPermission, checkRole } = useUserStore();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return checkPermission(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  const hasRole = (roles: RoleType[]): boolean => {
    return checkRole(roles);
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isPipelineUser = (): boolean => {
    return user?.role === 'pipelineUser';
  };

  const canViewAllData = (): boolean => {
    return hasRole(['admin', 'supervisor']);
  };

  const getPipelineUnitFilter = (): string | undefined => {
    if (canViewAllData()) return undefined;
    return user?.pipelineUnitId;
  };

  return {
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
    isPipelineUser,
    canViewAllData,
    getPipelineUnitFilter,
  };
};
