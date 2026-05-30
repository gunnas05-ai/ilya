import { useMemo, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { ROLE_PERMISSIONS, Permission } from '../constants/permissions';
import { subscribeToEvent } from '../services/websocket';

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'GUEST';
  const [refreshKey, setRefreshKey] = useState(0);

  // Live permission refresh via WebSocket
  useEffect(() => {
    const unsub = subscribeToEvent('PERMISSION_CHANGED', (payload: any) => {
      if (payload.role === role) setRefreshKey((k) => k + 1);
    });
    return unsub;
  }, [role]);

  // Force logout handler
  useEffect(() => {
    const unsub = subscribeToEvent('FORCE_LOGOUT', (payload: any) => {
      if (payload.userId === user?.id) {
        useAuthStore.getState().logout();
      }
    });
    return unsub;
  }, [user?.id]);

  const permissions = useMemo(() => ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.GUEST, [role, refreshKey]);

  const can = (permission: Permission): boolean => permissions.includes(permission);

  const canAny = (...perms: Permission[]): boolean => perms.some((p) => permissions.includes(p));

  const canAll = (...perms: Permission[]): boolean => perms.every((p) => permissions.includes(p));

  const isRole = (...roles: string[]): boolean => roles.includes(role);

  return { can, canAny, canAll, isRole, permissions, role };
}
