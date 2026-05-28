export type LoadStatus = 'beklemede' | 'yolda' | 'teslim_edildi';

export interface TrackingPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  label?: string;
}

export interface LoadTracking {
  id: string;
  loadId: string;
  title: string;
  creatorId: string;
  receiverId: string | null;
  status: LoadStatus;
  pickupLocation: TrackingPoint;
  deliveryLocation: TrackingPoint;
  currentLocation: TrackingPoint;
  estimatedArrival?: string;
  distanceToCreator?: number;
  distanceToReceiver?: number;
  updatedAt: string;
  loadType: string;
  route: {
    fromCity: string;
    fromDistrict: string;
    toCity: string;
    toDistrict: string;
  };
  deliveryVerified: boolean;
  deliveryVerificationMethod?: 'qr' | 'photo' | 'otp' | 'gps';
  tonnage?: number;
  volume?: number;
  vehicleType?: string;
  trailerType?: string;
  coldChain?: boolean;
  urgency?: string;
  insurance?: boolean;
  insurancePackage?: string;
  totalPrice?: number;
}

export interface TrackedLoadItem {
  tracking: LoadTracking;
  unread: boolean;
}
