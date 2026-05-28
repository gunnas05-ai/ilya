export interface TruckProfile {
  height: number;       // cm
  width: number;        // cm
  length: number;       // cm
  totalWeight: number;  // kg
  axleWeight: number;   // kg
  adrClass: string;     // '1'-'9' or ''
  trailerType: string;
  hasRefrigeration: boolean;
}

export interface CarrierProfile {
  user?: { fullName?: string };
  wallet?: { balance: number; blockedBalance: number };
  companyName: string;
  truckProfile?: TruckProfile;
  licenseNumber: string;
  plateNumber: string;
  vehicleType: string;
  vehicleCapacity: string;
  tonnageCapacity: number;
  volumeCapacity: number;
  kBelgesi: string;
  srcBelgesi: string;
  iban: string;
  taxNumber: string;
  taxOffice: string;
  escrowAccountVerified: boolean;
  phone: string;
  email: string;
  tcKimlikNo?: string;
  isIdentityVerified?: boolean;
  vehicleHeight?: number;
  vehicleWidth?: number;
  vehicleLength?: number;
  totalWeight?: number;
  axleWeight?: number;
  adrClass?: string;
  trailerType?: string;
  hasRefrigeration?: boolean;
  accountantName?: string;
  accountantEmail?: string;
  accountantPhone?: string;
}

export const REQUIRED_FIELDS: (keyof CarrierProfile)[] = [
  'licenseNumber',
  'plateNumber',
  'vehicleType',
  'vehicleCapacity',
  'tonnageCapacity',
  'volumeCapacity',
  'kBelgesi',
  'srcBelgesi',
  'iban',
  'taxNumber',
];

export const VEHICLE_OPTIONS = [
  'Çekici (TIR)',
  'Kamyon',
  'Kırkayak Kamyon',
  'Lowbed Çekici',
  'Tanker Çekici',
  'Frigorifik Araç',
  'Konteyner Taşıyıcı',
  'Silobas Çekici',
  'Kapalı Kasa Kamyonet',
  'Panelvan',
  'Pickup',
  'Minivan',
];
