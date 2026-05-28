// ── Granular Permission Set — EX-005 RBAC Implementation ──
// Based on 16login.txt role definitions and 00 kurallar.txt RBAC requirements

import { AppRole } from '../store/authStore';

export type Permission =
  // Load / Shipment
  | 'load:create'
  | 'load:view'
  | 'load:edit'
  | 'load:delete'
  | 'load:bid'
  | 'load:accept'
  | 'load:track'
  // Finance
  | 'finance:view'
  | 'finance:create_expense'
  | 'finance:create_income'
  | 'finance:manage_budget'
  | 'finance:view_dashboard'
  // GIB / E-Documents
  | 'gib:create_invoice'
  | 'gib:view_invoices'
  | 'gib:send_gib'
  // Escrow / Payment
  | 'escrow:use'
  | 'escrow:dispute'
  | 'escrow:release'
  // Profile / Carrier
  | 'profile:edit'
  | 'profile:verify_docs'
  | 'profile:view_wallet'
  // Marketplace
  | 'marketplace:view'
  | 'marketplace:create_listing'
  | 'marketplace:buy'
  // Roadside Services
  | 'roadside:view_fuel'
  | 'roadside:view_restaurants'
  | 'roadside:make_reservation'
  | 'roadside:write_review'
  // Admin / Super Admin
  | 'admin:view_panel'
  | 'admin:manage_users'
  | 'admin:moderate_listings'
  | 'admin:resolve_disputes'
  | 'admin:manage_promotions'
  | 'admin:manage_kvkk'
  | 'admin:integrations'
  // Analytics
  | 'analytics:view'
  // Communication
  | 'chat:use'
  | 'notifications:view'
  // AI / Voice
  | 'ai:use_dialog'
  | 'ai:use_voice_commands'
  | 'drive_mode:use';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  SUPER_ADMIN: [
    'load:create', 'load:view', 'load:edit', 'load:delete', 'load:bid', 'load:accept', 'load:track',
    'finance:view', 'finance:create_expense', 'finance:create_income', 'finance:manage_budget', 'finance:view_dashboard',
    'gib:create_invoice', 'gib:view_invoices', 'gib:send_gib',
    'escrow:use', 'escrow:dispute', 'escrow:release',
    'profile:edit', 'profile:verify_docs', 'profile:view_wallet',
    'marketplace:view', 'marketplace:create_listing', 'marketplace:buy',
    'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:make_reservation', 'roadside:write_review',
    'admin:view_panel', 'admin:manage_users', 'admin:moderate_listings', 'admin:resolve_disputes', 'admin:manage_promotions', 'admin:manage_kvkk', 'admin:integrations',
    'analytics:view',
    'chat:use', 'notifications:view',
    'ai:use_dialog', 'ai:use_voice_commands', 'drive_mode:use',
  ],

  SHIPPER: [
    'load:create', 'load:view', 'load:edit', 'load:delete', 'load:track',
    'finance:view', 'finance:view_dashboard',
    'gib:create_invoice', 'gib:view_invoices',
    'escrow:use', 'escrow:dispute',
    'profile:edit', 'profile:view_wallet',
    'roadside:view_fuel', 'roadside:view_restaurants',
    'analytics:view',
    'chat:use', 'notifications:view',
    'ai:use_dialog',
  ],

  DRIVER: [
    'load:view', 'load:bid', 'load:accept', 'load:track',
    'finance:view', 'finance:create_expense',
    'gib:create_invoice', 'gib:view_invoices',
    'escrow:use', 'escrow:dispute',
    'profile:edit', 'profile:verify_docs', 'profile:view_wallet',
    'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:make_reservation', 'roadside:write_review',
    'analytics:view',
    'chat:use', 'notifications:view',
    'drive_mode:use',
  ],

  BUSINESS: [
    'load:view',
    'finance:view',
    'profile:edit',
    'marketplace:view',
    'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:write_review',
    'analytics:view',
    'chat:use', 'notifications:view',
  ],

  GENERAL_USER: [
    'load:view',
    'finance:view',
    'profile:edit',
    'marketplace:view', 'marketplace:buy',
    'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:write_review',
    'chat:use', 'notifications:view',
  ],

  GUEST: [
    'load:view',
    'roadside:view_fuel', 'roadside:view_restaurants',
  ],
};
