/**
 * Carrier API — Shipment State Machine
 *
 * Gecerli durum gecisleri:
 *   ASSIGNED   → DISPATCHED, CANCELLED
 *   DISPATCHED → IN_TRANSIT, CANCELLED
 *   IN_TRANSIT → ARRIVED, DELAYED
 *   ARRIVED    → UNLOADING
 *   UNLOADING  → COMPLETED
 *   DELAYED    → IN_TRANSIT, CANCELLED
 */

export type ShipmentState =
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'UNLOADING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DELAYED';

export interface StateTransition {
  from: ShipmentState;
  to: ShipmentState;
  description: string;
  triggersEvent: string;
}

const STATE_TRANSITIONS: Record<ShipmentState, ShipmentState[]> = {
  ASSIGNED:   ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'DELAYED'],
  ARRIVED:    ['UNLOADING'],
  UNLOADING:  ['COMPLETED'],
  DELAYED:    ['IN_TRANSIT', 'CANCELLED'],
  COMPLETED:  [],
  CANCELLED:  [],
};

export function canTransition(from: ShipmentState, to: ShipmentState): boolean {
  const allowed = STATE_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function getAllowedTransitions(state: ShipmentState): ShipmentState[] {
  return STATE_TRANSITIONS[state] || [];
}

export const TRANSITION_EVENTS: Record<string, string> = {
  'ASSIGNED→DISPATCHED': 'carrier.dispatched',
  'ASSIGNED→CANCELLED': 'carrier.assignment_cancelled',
  'DISPATCHED→IN_TRANSIT': 'carrier.in_transit',
  'DISPATCHED→CANCELLED': 'carrier.dispatch_cancelled',
  'IN_TRANSIT→ARRIVED': 'carrier.arrived',
  'IN_TRANSIT→DELAYED': 'carrier.delayed',
  'ARRIVED→UNLOADING': 'carrier.unloading',
  'UNLOADING→COMPLETED': 'shipment.status.COMPLETED',
  'DELAYED→IN_TRANSIT': 'carrier.resumed',
  'DELAYED→CANCELLED': 'carrier.delayed_cancelled',
};

export function getTransitionEvent(from: ShipmentState, to: ShipmentState): string {
  return TRANSITION_EVENTS[`${from}→${to}`] || 'carrier.status_changed';
}
