import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { ROLE_PERMISSIONS, Permission } from '../constants/permissions';

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'GUEST';

  const permissions = useMemo(() => ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.GUEST, [role]);

  const can = (permission: Permission): boolean => permissions.includes(permission);

  const canAny = (...perms: Permission[]): boolean => perms.some((p) => permissions.includes(p));

  const canAll = (...perms: Permission[]): boolean => perms.every((p) => permissions.includes(p));

  const isRole = (...roles: string[]): boolean => roles.includes(role);

  return { can, canAny, canAll, isRole, permissions, role };
}
