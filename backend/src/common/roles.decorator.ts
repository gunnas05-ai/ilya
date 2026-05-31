import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

/**
 * Rol bazli yetkilendirme — ornek: @Roles('super_admin', 'admin').
 * RolesGuard tarafindan okunur, super_admin otomatik bypass yapar.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Granular permission bazli yetkilendirme — ornek: @Permissions('load:create', 'load:edit').
 * RolesGuard tarafindan role_permissions tablosuyla karsilastirilir.
 *
 * KULLANIM: Controller metoduna ekleyin:
 *   @Permissions('finance:view', 'escrow:use')
 *   async someMethod() { ... }
 *
 * Su an projede @Roles() agirlikli kullaniliyor. @Permissions() daha granular
 * kontrol saglar — ornegin ayni rol icindeki farkli yetki seviyeleri icin.
 * Gecis asamali olarak yapilacak.
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
