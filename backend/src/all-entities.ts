import { Vehicle, VehiclePhoto } from './vehicles/vehicle.entity';
import { VehicleCategory } from './vehicles/category.entity';
import { VehicleListing, VehicleBid } from './vehicles/listing.entity';
import { User } from './users/user.entity';
import { Load } from './loads/load.entity';
import { EpdkFuelPrice } from './loads/epdk-fuel-price.entity';
import { Bid } from './bids/bid.entity';
import { TrackingRecord } from './tracking/tracking.entity';
import { DeliveryVerification } from './tracking/delivery-verification.entity';
import { DriverHours } from './tracking/driver-hours.entity';
import { EscrowTransaction } from './escrow/escrow-transaction.entity';
import { Wallet, WalletTransaction } from './escrow/wallet.entity';
import { Dispute } from './escrow/dispute.entity';
import { DisputeEvidence } from './escrow/dispute-evidence.entity';
import { WithdrawalRequest } from './escrow/withdrawal-request.entity';
import { AuditLog } from './escrow/audit-log.entity';
import { OutboxEvent } from './escrow/outbox.entity';
import { InsurancePolicy } from './escrow/insurance.entity';
import { Notification } from './notifications/notification.entity';
import { QRCode } from './qr/qr-code.entity';
import { CarrierAnalytics } from './analytics/carrier-analytics.entity';
import { CarrierBadge } from './analytics/carrier-badge.entity';
import { CarrierScorecard } from './analytics/carrier-scorecard.entity';
import { Invoice } from './gib/invoice.entity';
import { InvoiceItem } from './gib/invoice-item.entity';
import { InvoiceLog } from './gib/invoice-log.entity';
import { Customer } from './gib/customer.entity';
import { Company } from './gib/company.entity';
import { GibSubmission } from './gib/gib-submission.entity';
import { XmlDocument } from './gib/xml-document.entity';
import { BlockchainAnchor } from './gib/blockchain-anchor.entity';
import { Income } from './finance/income.entity';
import { Expense } from './finance/expense.entity';
import { ExpenseCategory } from './finance/expense-category.entity';
import { ShipmentDocument } from './finance/shipment-document.entity';
import { OcrDocument } from './finance/ocr-document.entity';
import { FinanceReminder } from './finance/finance-reminder.entity';
import { RecurringIncomeTemplate } from './finance/recurring-income-template.entity';
import { FinanceInvite } from './finance/finance-invite.entity';
import { FuelStation, FuelPrice, StationService, Brand, StationImage, StationReview, FavoriteStation, FuelAlert, FuelPriceHistory, RouteStationMatch, StationAuditLog, SavedStationFilter } from './fuel-stations';
import { FuelCard, FuelCardTransaction } from './fuel-stations/fuel-card.entity';
import { Restaurant, RestaurantImage, Menu, MenuItem, MenuItemReview, RestaurantReview, ReviewReply, RestaurantFavorite, RestaurantReservation, RestaurantTable, RestaurantCapacityConfig } from './restaurants';
import { Announcement } from './announcements/announcement.entity';
import { UetdsTransaction } from './uetds/uetds-transaction.entity';
import { DeliverySignature } from './pod/delivery-signature.entity';
import { DeliveryPhoto } from './pod/delivery-photo.entity';
import { Webhook } from './integrations/webhook.entity';
import { ApiKey } from './integrations/api-key.entity';
import { Listing } from './marketplace/listing.entity';
import { ListingCategory } from './marketplace/listing-category.entity';
import { VehicleDetail } from './marketplace/vehicle-detail.entity';
import { ListingOffer } from './marketplace/listing-offer.entity';
import { Permission } from './common/permission.entity';
import { Role } from './common/role.entity';
import { RolePermission } from './common/role-permission.entity';
import { TestRun, TestResult, SystemHealthLog } from './common/test-run.entity';
import { AdminAuditLog, SecurityEvent } from './common/admin-audit.entity';
import { City } from './common/city.entity';
import { District } from './common/district.entity';
import { WhatsAppSettings } from './common/whatsapp-settings.entity';
import { SystemSetting } from './common/system-setting.entity';
import { DriverFeedPost, DriverFeedComment, RoadReport } from './common/driver-feed.entity';
import { Shipper } from './shipper-api/entities/shipper.entity';
import { ShipmentStatusHistory } from './shipper-api/entities/shipment-status-history.entity';
import { Carrier } from './carrier-api/entities/carrier.entity';
import { CarrierStatusHistory } from './carrier-api/entities/carrier-status-history.entity';
import { RateAgreement } from './rate-api/entities/rate-agreement.entity';
import { WebhookDeadLetter } from './integrations/entities/webhook-dead-letter.entity';
import { ErpIntegrationConfig } from './erp-integration/entities/erp-integration-config.entity';
import { Warehouse, WarehouseAppointment, Dock } from './warehouse/entities/warehouse.entity';
import { CustomsDeclaration, CustomsDocument } from './customs/entities/customs-declaration.entity';
import { VehiclePosition } from './tracking/vehicle-position.entity';
import { PaymentMethod } from './payment/entities/payment-method.entity';
import { PaymentTransaction } from './payment/entities/payment-transaction.entity';
import { SubscriptionPlan } from './billing/entities/subscription-plan.entity';
import { UserSubscription } from './billing/entities/user-subscription.entity';
import { CreditPackage } from './billing/entities/credit-package.entity';
import { UserCredit, CreditTransaction } from './billing/entities/user-credit.entity';
import { CommissionConfig } from './billing/entities/commission-config.entity';
// v2.0 cleanup: SponsoredVehicle, NavlunEndeksiSubscription, WhiteLabelConfig, PremiumFeature removed
import { PartListing } from './part-market/entities/part-listing.entity';
import { PartCategory, PartPhoto, PartOffer, PartFavorite, PartTransaction, PartReview, PartDispute, PartBoost, PartCommissionConfig } from './part-market/entities/part-entities';
import { WalletLedger } from './payment-core/entities/ledger.entity';
import { ChatRoom } from './chat/chat-room.entity';
import { ChatMessage } from './chat/chat-message.entity';

import { CarrierPreference } from './ai-matching/carrier-preference.entity';
import { RateRecord } from './rate-intelligence/rate-record.entity';
import { InstantBooking } from './instant-booking/instant-booking.entity';
import { MatchingFeedback } from './ai-matching/matching-feedback.entity';
import { ReloadBundle } from './automated-reloads/reload-bundle.entity';
import { TaxPeriodSummary, DeclarationDraft, TaxDefinition, AuditLog as TaxAuditLog, WithholdingDefinition, EDocumentLog } from './tax/tax.entity';

export const ALL_ENTITIES = [
  User, Vehicle, VehiclePhoto, VehicleCategory, VehicleListing, VehicleBid,
  Load, EpdkFuelPrice, Bid, TrackingRecord, DeliveryVerification, DriverHours,
  EscrowTransaction, Wallet, WalletTransaction, Dispute, DisputeEvidence, WithdrawalRequest, AuditLog, OutboxEvent, InsurancePolicy,
  Notification, QRCode, CarrierAnalytics, CarrierBadge, CarrierScorecard,
  Invoice, InvoiceItem, InvoiceLog, Customer, Company, GibSubmission, XmlDocument, BlockchainAnchor,
  Income, Expense, ExpenseCategory, ShipmentDocument, OcrDocument,
  FinanceReminder, RecurringIncomeTemplate, FinanceInvite,
  FuelStation, FuelPrice, StationService, Brand, StationImage, StationReview, FavoriteStation, FuelAlert, FuelPriceHistory, RouteStationMatch, StationAuditLog, SavedStationFilter, FuelCard, FuelCardTransaction,
  Restaurant, RestaurantImage, Menu, MenuItem, MenuItemReview, RestaurantReview, ReviewReply, RestaurantFavorite, RestaurantReservation, RestaurantTable, RestaurantCapacityConfig,
  Announcement, UetdsTransaction, DeliverySignature, DeliveryPhoto, Webhook, ApiKey,
  Listing, ListingCategory, VehicleDetail, ListingOffer,
  Permission, Role, RolePermission, TestRun, TestResult, SystemHealthLog, AdminAuditLog, SecurityEvent,
  City, District,
  WhatsAppSettings, SystemSetting, DriverFeedPost, DriverFeedComment, RoadReport,
  Shipper, ShipmentStatusHistory, Carrier, CarrierStatusHistory, RateAgreement, WebhookDeadLetter,
  ErpIntegrationConfig, Warehouse, WarehouseAppointment, Dock, CustomsDeclaration, CustomsDocument,
  VehiclePosition,
  PaymentMethod, PaymentTransaction,
  SubscriptionPlan, UserSubscription, CreditPackage, UserCredit, CreditTransaction, CommissionConfig,
  // cleanup
  PartListing, PartCategory, PartPhoto, PartOffer, PartFavorite, PartTransaction, PartReview, PartDispute, PartBoost, PartCommissionConfig,
  WalletLedger,
  ChatRoom, ChatMessage, ReloadBundle, CarrierPreference, RateRecord, InstantBooking, MatchingFeedback,
  TaxPeriodSummary, DeclarationDraft, TaxDefinition, TaxAuditLog, WithholdingDefinition, EDocumentLog,
];
