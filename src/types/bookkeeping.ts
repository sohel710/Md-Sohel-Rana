export type Language = 'en' | 'bn';
export type ThemeMode = 'light' | 'dark';
export type AppTab = 'home' | 'people' | 'ledger' | 'reminders' | 'more';

export type AccountType = 'ASSET_CASH' | 'ASSET_RECEIVABLE' | 'LIABILITY_PAYABLE' | 'INCOME_SALES' | 'EXPENSE_OPERATING';

export type TransactionKind =
  | 'CUSTOMER_CREDIT'      // Give Credit (বাকি দিলাম)
  | 'CUSTOMER_PAYMENT'     // Receive Payment (টাকা পেলাম)
  | 'SUPPLIER_PURCHASE'    // Purchase on Credit from Supplier
  | 'SUPPLIER_PAYMENT'     // Payment to Supplier
  | 'EXPENSE'              // Daily Business Expense
  | 'REVERSAL';            // Immutable Correction / Reversal

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Transport'
  | 'Staff Salary'
  | 'Shop Supplies'
  | 'Packaging'
  | 'Other';

export type ReminderChannel = 'WhatsApp' | 'SMS' | 'Local Notification';
export type ReminderStatus = 'Scheduled' | 'Sent';
export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface UserRecord {
  id: string;
  phone: string;
  fullName: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  createdAt: string;
}

export interface BusinessRecord {
  id: string;
  name: string;
  nameBn: string;
  ownerName: string;
  phone: string;
  address: string;
  category: string;
  currency: 'BDT';
  createdAt: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  name: string;
  phone: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  active: boolean;
}

export interface CustomerRecord {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  address: string;
  openingBalancePaisa: number; // Positive means customer owes shop
  balancePaisa: number;        // Current outstanding receivable
  dueDate?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRecord {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  address: string;
  openingBalancePaisa: number; // Positive means shop owes supplier
  balancePaisa: number;        // Current outstanding payable
  dueDate?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountRecord {
  id: string;
  businessId: string;
  code: string;
  name: string;
  type: AccountType;
  balancePaisa: number;
}

export interface TransactionRecord {
  id: string;
  businessId: string;
  kind: TransactionKind;
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'BUSINESS';
  partyId?: string;
  partyName: string;
  amountPaisa: number;
  note: string;
  date: string; // ISO string
  dueDate?: string;
  attachmentId?: string;
  reversedByTxId?: string;
  reversesTxId?: string;
  syncStatus: SyncStatus;
  createdBy: string;
  createdAt: string;
}

export interface LedgerEntryRecord {
  id: string;
  transactionId: string;
  accountId: string;
  accountName: string;
  debitPaisa: number;
  creditPaisa: number;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  businessId: string;
  transactionId: string;
  title: string;
  category: ExpenseCategory;
  amountPaisa: number;
  note: string;
  date: string;
  archived: boolean;
  createdAt: string;
}

export interface ReminderRecord {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  amountPaisa: number;
  dueDate: string;
  channel: ReminderChannel;
  message: string;
  status: ReminderStatus;
  sentAt?: string;
  replyNote?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface AttachmentRecord {
  id: string;
  transactionId: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  businessId: string;
  actorName: string;
  action: string;
  entityType: 'TRANSACTION' | 'CUSTOMER' | 'SUPPLIER' | 'EXPENSE' | 'REMINDER' | 'SECURITY' | 'BACKUP';
  entityId: string;
  summary: string;
  timestamp: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'INSERT' | 'UPDATE';
  status: SyncStatus;
  queuedAt: string;
  lastAttemptAt?: string;
}

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  pinEnabled: boolean;
  pinCode: string;
  biometricEnabled: boolean;
  offlineMode: boolean;
  autoBackup: boolean;
  lastBackupAt?: string;
}

export interface DueNoteDatabase {
  user: UserRecord;
  business: BusinessRecord;
  members: BusinessMember[];
  customers: CustomerRecord[];
  suppliers: SupplierRecord[];
  accounts: AccountRecord[];
  transactions: TransactionRecord[];
  ledgerEntries: LedgerEntryRecord[];
  expenses: ExpenseRecord[];
  reminders: ReminderRecord[];
  attachments: AttachmentRecord[];
  auditLogs: AuditLogRecord[];
  syncQueue: SyncQueueItem[];
  settings: AppSettings;
}
