import { canTransition, getAllowedTransitions, getTransitionEvent, ShipmentState } from './state-machine';

describe('Carrier State Machine', () => {
  describe('canTransition', () => {
    it('ASSIGNED → DISPATCHED gecerli', () => {
      expect(canTransition('ASSIGNED', 'DISPATCHED')).toBe(true);
    });

    it('ASSIGNED → CANCELLED gecerli', () => {
      expect(canTransition('ASSIGNED', 'CANCELLED')).toBe(true);
    });

    it('ASSIGNED → COMPLETED gecersiz', () => {
      expect(canTransition('ASSIGNED', 'COMPLETED')).toBe(false);
    });

    it('DISPATCHED → IN_TRANSIT gecerli', () => {
      expect(canTransition('DISPATCHED', 'IN_TRANSIT')).toBe(true);
    });

    it('DISPATCHED → CANCELLED gecerli', () => {
      expect(canTransition('DISPATCHED', 'CANCELLED')).toBe(true);
    });

    it('IN_TRANSIT → ARRIVED gecerli', () => {
      expect(canTransition('IN_TRANSIT', 'ARRIVED')).toBe(true);
    });

    it('IN_TRANSIT → DELAYED gecerli', () => {
      expect(canTransition('IN_TRANSIT', 'DELAYED')).toBe(true);
    });

    it('DELAYED → IN_TRANSIT gecerli (gecikme sonrasi devam)', () => {
      expect(canTransition('DELAYED', 'IN_TRANSIT')).toBe(true);
    });

    it('DELAYED → CANCELLED gecerli', () => {
      expect(canTransition('DELAYED', 'CANCELLED')).toBe(true);
    });

    it('ARRIVED → UNLOADING gecerli', () => {
      expect(canTransition('ARRIVED', 'UNLOADING')).toBe(true);
    });

    it('UNLOADING → COMPLETED gecerli', () => {
      expect(canTransition('UNLOADING', 'COMPLETED')).toBe(true);
    });

    it('COMPLETED → hicbir yere gidilemez', () => {
      const allowed = getAllowedTransitions('COMPLETED');
      expect(allowed).toHaveLength(0);
    });

    it('CANCELLED → hicbir yere gidilemez', () => {
      const allowed = getAllowedTransitions('CANCELLED');
      expect(allowed).toHaveLength(0);
    });

    it('Gecersiz durumlar', () => {
      expect(canTransition('ASSIGNED' as ShipmentState, 'UNLOADING' as ShipmentState)).toBe(false);
      expect(canTransition('IN_TRANSIT' as ShipmentState, 'DISPATCHED' as ShipmentState)).toBe(false);
      expect(canTransition('UNLOADING' as ShipmentState, 'IN_TRANSIT' as ShipmentState)).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('ASSIGNED icin 2 gecis', () => {
      expect(getAllowedTransitions('ASSIGNED')).toEqual(['DISPATCHED', 'CANCELLED']);
    });

    it('IN_TRANSIT icin 2 gecis', () => {
      expect(getAllowedTransitions('IN_TRANSIT')).toEqual(['ARRIVED', 'DELAYED']);
    });
  });

  describe('getTransitionEvent', () => {
    it('UNLOADING → COMPLETED shipment.status.COMPLETED eventi uretir', () => {
      expect(getTransitionEvent('UNLOADING', 'COMPLETED')).toBe('shipment.status.COMPLETED');
    });

    it('IN_TRANSIT → DELAYED carrier.delayed eventi uretir', () => {
      expect(getTransitionEvent('IN_TRANSIT', 'DELAYED')).toBe('carrier.delayed');
    });

    it('bilinmeyen gecis carrier.status_changed uretir', () => {
      expect(getTransitionEvent('ASSIGNED' as ShipmentState, 'DELAYED' as ShipmentState))
        .toBe('carrier.status_changed');
    });
  });
});
