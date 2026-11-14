import {
  AccountRecord,
  AuditLogRecord,
  CustomerRecord,
  DueNoteDatabase,
  ExpenseRecord,
  LedgerEntryRecord,
  ReminderRecord,
  SupplierRecord,
  TransactionRecord,
} from '../types/bookkeeping';
import { toPaisa } from '../utils/currency';

const BUSINESS_ID = 'biz_sohel_001';
const USER_ID = 'usr_sohel_owner';

const NAMED_CUSTOMERS: Array<{ name: string; phone: string; address: string; balance: number; dueDays?: number }> = [
  { name: 'Karim Grocery', phone: '+8801711223344', address: 'Mirpur-10, Dhaka', balance: 14500, dueDays: 3 },
  { name: 'Rahman Telecom', phone: '+8801812334455', address: 'Kazipara, Dhaka', balance: 11200, dueDays: 5 },
  { name: 'Ayesha Boutique', phone: '+8801913445566', address: 'Shewrapara, Dhaka', balance: 9800, dueDays: 2 },
  { name: 'Jamal Hardware', phone: '+8801714556677', address: 'Section-6, Mirpur', balance: 8500, dueDays: 7 },
  { name: 'Nusrat Pharmacy', phone: '+8801615667788', address: 'Pallabi, Dhaka', balance: 7400, dueDays: 4 },
  { name: 'Hasan Tea Stall', phone: '+8801516778899', address: 'Mirpur-11 Bazar', balance: 6200, dueDays: 1 },
  { name: 'Mizan Electronics', phone: '+8801717889900', address: 'Agargaon, Dhaka', balance: 5800 },
  { name: 'Farhana Tailors', phone: '+8801818990011', address: 'Kallyanpur, Dhaka', balance: 4600 },
  { name: 'Tariq Bakery', phone: '+8801919001122', address: 'Mirpur-2, Dhaka', balance: 4100 },
  { name: 'Rafiq Enterprise', phone: '+8801720112233', address: 'Gabtoli, Dhaka', balance: 3700 },
  { name: 'Sumaiya Cosmetics', phone: '+8801821223344', address: 'Mirpur-1, Dhaka', balance: 3200 },
  { name: 'Babu Auto Parts', phone: '+8801922334455', address: 'Tolarbag, Dhaka', balance: 2500 },
  { name: 'Kamal Stationery', phone: '+8801723445566', address: 'Monipur, Dhaka', balance: 1800 },
  { name: 'Shapla Variety Store', phone: '+8801624556677', address: 'Pirerbag, Dhaka', balance: 1200 },
  { name: 'Rony Mobile Zone', phone: '+8801525667788', address: 'Shah Ali Market', balance: 1000 },
];

const EXTRA_BD_FIRST = [
  'Arif', 'Sajid', 'Nayeem', 'Tanvir', 'Mehedi', 'Imran', 'Ashraf', 'Faisal',
  'Sharmin', 'Nadia', 'Tasnim', 'Rubel', 'Shakil', 'Mahmud', 'Masud', 'Jibon',
  'Monir', 'Selim', 'Kabir', 'Zakir', 'Alamin', 'Habib',
];
const EXTRA_BD_LAST = [
  'Store', 'Traders', 'Mart', 'Enterprises', 'Corner',
];

const NAMED_SUPPLIERS: Array<{ name: string; phone: string; address: string; balance: number; dueDays?: number }> = [
  { name: 'City Wholesalers', phone: '+8801710998877', address: 'Chawkbazar, Old Dhaka', balance: 10500, dueDays: 6 },
  { name: 'Meghna Agro & Oil', phone: '+8801811887766', address: 'Moulvibazar, Dhaka', balance: 7200, dueDays: 4 },
  { name: 'Bashundhara Distributors', phone: '+8801912776655', address: 'Tejgaon I/A, Dhaka', balance: 5800, dueDays: 9 },
  { name: 'Dhaka Beverage Supply', phone: '+8801713665544', address: 'Karwan Bazar, Dhaka', balance: 4000 },
  { name: 'Pran-RFL Depot', phone: '+8801614554433', address: 'Badda, Dhaka', balance: 2700 },
  { name: 'Walton Smart Agency', phone: '+8801515443322', address: 'Motijheel, Dhaka', balance: 1800 },
  { name: 'Square Consumer Line', phone: '+8801716332211', address: 'Mohakhali, Dhaka', balance: 0 },
  { name: 'ACI Foods Depot', phone: '+8801817221100', address: 'Tejgaon, Dhaka', balance: 0 },
  { name: 'Ispahani Tea Agency', phone: '+8801918110099', address: 'Khatunganj Hub', balance: 0 },
  { name: 'Fresh Rice Mill', phone: '+8801719009988', address: 'Badamtoli, Dhaka', balance: 0 },
  { name: 'Akij Flour Depot', phone: '+8801620998877', address: 'Narayanganj Road', balance: 0 },
  { name: 'Olympic Biscuits Agency', phone: '+8801521887766', address: 'Kanchpur, Dhaka', balance: 0 },
  { name: 'Marico Care Wholesale', phone: '+8801722776655', address: 'Uttara Sector-3', balance: 0 },
  { name: 'Unilever Trade Point', phone: '+8801823665544', address: 'Gulshan-1, Dhaka', balance: 0 },
  { name: 'Kohinoor Chemical Hub', phone: '+8801924554433', address: 'Tongi Industrial', balance: 0 },
  { name: 'Danish Milk Supply', phone: '+8801725443322', address: 'Savar, Dhaka', balance: 0 },
  { name: 'Kazi Farms Kitchen Hub', phone: '+8801626332211', address: 'Dhanmondi, Dhaka', balance: 0 },
  { name: 'Bengal Packaging Co.', phone: '+8801527221100', address: 'Nawabpur, Dhaka', balance: 0 },
];

function daysAgoIso(days: number, hoursOffset = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hoursOffset, 15, 0, 0);
  return d.toISOString();
}

function daysAheadDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function createDemoSeed(): DueNoteDatabase {
  const nowIso = new Date().toISOString();

  // Build 125 Customers (15 with balances summing to exactly ৳85,500 + 110 settled customers)
  const customers: CustomerRecord[] = [];
  NAMED_CUSTOMERS.forEach((c, idx) => {
    customers.push({
      id: `cust_${String(idx + 1).padStart(3, '0')}`,
      businessId: BUSINESS_ID,
      name: c.name,
      phone: c.phone,
      address: c.address,
      openingBalancePaisa: toPaisa(c.balance),
      balancePaisa: toPaisa(c.balance),
      dueDate: c.dueDays ? daysAheadDate(c.dueDays) : undefined,
      archived: false,
      createdAt: daysAgoIso(30 - idx),
      updatedAt: daysAgoIso(idx % 5),
    });
  });

  for (let i = 16; i <= 125; i++) {
    const first = EXTRA_BD_FIRST[(i * 7) % EXTRA_BD_FIRST.length];
    const last = EXTRA_BD_LAST[(i * 3) % EXTRA_BD_LAST.length];
    const phoneSuffix = String(10000000 + i * 137).slice(0, 8);
    customers.push({
      id: `cust_${String(i).padStart(3, '0')}`,
      businessId: BUSINESS_ID,
      name: `${first} ${last} #${i}`,
      phone: `+88017${phoneSuffix}`,
      address: 'Mirpur, Dhaka',
      openingBalancePaisa: 0,
      balancePaisa: 0,
      archived: false,
      createdAt: daysAgoIso(45 + (i % 60)),
      updatedAt: daysAgoIso(10 + (i % 20)),
    });
  }

  // Build 18 Suppliers (6 with balances summing to exactly ৳32,000 + 12 settled)
  const suppliers: SupplierRecord[] = NAMED_SUPPLIERS.map((s, idx) => ({
    id: `supp_${String(idx + 1).padStart(3, '0')}`,
    businessId: BUSINESS_ID,
    name: s.name,
    phone: s.phone,
    address: s.address,
    openingBalancePaisa: toPaisa(s.balance),
    balancePaisa: toPaisa(s.balance),
    dueDate: s.dueDays ? daysAheadDate(s.dueDays) : undefined,
    archived: false,
    createdAt: daysAgoIso(60 - idx),
    updatedAt: daysAgoIso(idx % 7),
  }));

  // Double-entry accounts
  const accounts: AccountRecord[] = [
    { id: 'acc_cash', businessId: BUSINESS_ID, code: '1010', name: 'Cash in Hand', type: 'ASSET_CASH', balancePaisa: toPaisa(142500) },
    { id: 'acc_ar', businessId: BUSINESS_ID, code: '1200', name: 'Accounts Receivable', type: 'ASSET_RECEIVABLE', balancePaisa: toPaisa(85500) },
    { id: 'acc_ap', businessId: BUSINESS_ID, code: '2010', name: 'Accounts Payable', type: 'LIABILITY_PAYABLE', balancePaisa: toPaisa(32000) },
    { id: 'acc_sales', businessId: BUSINESS_ID, code: '4010', name: 'Sales & Credit Revenue', type: 'INCOME_SALES', balancePaisa: toPaisa(395000) },
    { id: 'acc_exp', businessId: BUSINESS_ID, code: '5010', name: 'Operating Expenses', type: 'EXPENSE_OPERATING', balancePaisa: toPaisa(44500) },
  ];

  // Historical Transactions & Ledger Entries (consistent with today's activity and 6-month charts)
  const transactions: TransactionRecord[] = [
    {
      id: 'tx_001',
      businessId: BUSINESS_ID,
      kind: 'CUSTOMER_CREDIT',
      partyType: 'CUSTOMER',
      partyId: 'cust_001',
      partyName: 'Karim Grocery',
      amountPaisa: toPaisa(4500),
      note: 'Miniket rice 2 sacks & soybean oil 10L',
      date: daysAgoIso(0, 9),
      dueDate: daysAheadDate(3),
      syncStatus: 'synced',
      createdBy: 'Sohel Ahmed',
      createdAt: daysAgoIso(0, 9),
    },
    {
      id: 'tx_002',
      businessId: BUSINESS_ID,
      kind: 'CUSTOMER_PAYMENT',
      partyType: 'CUSTOMER',
      partyId: 'cust_002',
      partyName: 'Rahman Telecom',
      amountPaisa: toPaisa(6000),
      note: 'Partial cash collection for weekly credit',
      date: daysAgoIso(0, 11),
      syncStatus: 'synced',
      createdBy: 'Sohel Ahmed',
      createdAt: daysAgoIso(0, 11),
    },
    {
      id: 'tx_003',
      businessId: BUSINESS_ID,
      kind: 'EXPENSE',
      partyType: 'BUSINESS',
      partyName: 'DESCO Electricity Bill',
      amountPaisa: toPaisa(1850),
      note: 'Monthly shop electricity meter bill',
      date: daysAgoIso(0, 13),
      syncStatus: 'synced',
      createdBy: 'Sohel Ahmed',
      createdAt: daysAgoIso(0, 13),
    },
    {
      id: 'tx_004',
      businessId: BUSINESS_ID,
      kind: 'CUSTOMER_PAYMENT',
      partyType: 'CUSTOMER',
      partyId: 'cust_003',
      partyName: 'Ayesha Boutique',
      amountPaisa: toPaisa(3200),
      note: 'bKash transfer received',
      date: daysAgoIso(1, 16),
      syncStatus: 'synced',
      createdBy: 'Sohel Ahmed',
      createdAt: daysAgoIso(1, 16),
    },
    {
      id: 'tx_005',
      businessId: BUSINESS_ID,
      kind: 'SUPPLIER_PAYMENT',
      partyType: 'SUPPLIER',
      partyId: 'supp_001',
      partyName: 'City Wholesalers',
      amountPaisa: toPaisa(5500),
      note: 'Invoice #CW-882 partial settlement',
      date: daysAgoIso(2, 14),
      syncStatus: 'synced',
      createdBy: 'Sohel Ahmed',
      createdAt: daysAgoIso(2, 14),
    },
    {
      id: 'tx_006',
      businessId: BUSINESS_ID,
      kind: 'CUSTOMER_CREDIT',
      partyType: 'CUSTOMER',
      partyId: 'cust_004',
      partyName: 'Jamal Hardware',
      amountPaisa: toPaisa(8500),
      note: 'Bulk paint & shop supplies credit',
      date: daysAgoIso(3, 12),
      dueDate: daysAheadDate(7),
      syncStatus: 'synced',
      createdBy: 'Sohel Ahmed',
      createdAt: daysAgoIso(3, 12),
    },
    {
      id: 'tx_007',
      businessId: BUSINESS_ID,
      kind: 'SUPPLIER_PURCHASE',
      partyType: 'SUPPLIER',
      partyId: 'supp_002',
      partyName: 'Meghna Agro & Oil',
      amountPaisa: toPaisa(7200),
      note: 'Fresh mustard & soybean oil carton restock',
      date: daysAgoIso(4, 15),
      dueDate: daysAheadDate(4),
      syncStatus: 'synced',
      createdBy: 'Sohel Ahmed',
      createdAt: daysAgoIso(4, 15),
    },
    {
      id: 'tx_008',
      businessId: BUSINESS_ID,
      kind: 'EXPENSE',
      partyType: 'BUSINESS',
      partyName: 'Shop Rent — November',
      amountPaisa: toPaisa(12000),
      note: 'Monthly shop rent Mirpur-10',
      date: daysAgoIso(8, 10),
      syncStatus: 'synced',
      createdBy: 'Sohel Ahmed',
      createdAt: daysAgoIso(8, 10),
    },
  ];

  const ledgerEntries: LedgerEntryRecord[] = [
    { id: 'le_001a', transactionId: 'tx_001', accountId: 'acc_ar', accountName: 'Accounts Receivable', debitPaisa: toPaisa(4500), creditPaisa: 0, createdAt: transactions[0].createdAt },
    { id: 'le_001b', transactionId: 'tx_001', accountId: 'acc_sales', accountName: 'Sales & Credit Revenue', debitPaisa: 0, creditPaisa: toPaisa(4500), createdAt: transactions[0].createdAt },
    { id: 'le_002a', transactionId: 'tx_002', accountId: 'acc_cash', accountName: 'Cash in Hand', debitPaisa: toPaisa(6000), creditPaisa: 0, createdAt: transactions[1].createdAt },
    { id: 'le_002b', transactionId: 'tx_002', accountId: 'acc_ar', accountName: 'Accounts Receivable', debitPaisa: 0, creditPaisa: toPaisa(6000), createdAt: transactions[1].createdAt },
    { id: 'le_003a', transactionId: 'tx_003', accountId: 'acc_exp', accountName: 'Operating Expenses', debitPaisa: toPaisa(1850), creditPaisa: 0, createdAt: transactions[2].createdAt },
    { id: 'le_003b', transactionId: 'tx_003', accountId: 'acc_cash', accountName: 'Cash in Hand', debitPaisa: 0, creditPaisa: toPaisa(1850), createdAt: transactions[2].createdAt },
    { id: 'le_004a', transactionId: 'tx_004', accountId: 'acc_cash', accountName: 'Cash in Hand', debitPaisa: toPaisa(3200), creditPaisa: 0, createdAt: transactions[3].createdAt },
    { id: 'le_004b', transactionId: 'tx_004', accountId: 'acc_ar', accountName: 'Accounts Receivable', debitPaisa: 0, creditPaisa: toPaisa(3200), createdAt: transactions[3].createdAt },
  ];

  const expenses: ExpenseRecord[] = [
    {
      id: 'exp_001',
      businessId: BUSINESS_ID,
      transactionId: 'tx_003',
      title: 'DESCO Electricity Bill',
      category: 'Electricity',
      amountPaisa: toPaisa(1850),
      note: 'Monthly shop electricity meter bill',
      date: daysAgoIso(0, 13),
      archived: false,
      createdAt: daysAgoIso(0, 13),
    },
    {
      id: 'exp_002',
      businessId: BUSINESS_ID,
      transactionId: 'tx_008',
      title: 'Shop Rent — November',
      category: 'Rent',
      amountPaisa: toPaisa(12000),
      note: 'Monthly shop rent Mirpur-10',
      date: daysAgoIso(8, 10),
      archived: false,
      createdAt: daysAgoIso(8, 10),
    },
    {
      id: 'exp_003',
      businessId: BUSINESS_ID,
      transactionId: 'tx_hist_exp1',
      title: 'Van Transport (Chawkbazar)',
      category: 'Transport',
      amountPaisa: toPaisa(1450),
      note: 'Stock delivery rickshaw & pickup fare',
      date: daysAgoIso(5, 17),
      archived: false,
      createdAt: daysAgoIso(5, 17),
    },
    {
      id: 'exp_004',
      businessId: BUSINESS_ID,
      transactionId: 'tx_hist_exp2',
      title: 'Helper Staff Salary',
      category: 'Staff Salary',
      amountPaisa: toPaisa(8500),
      note: 'Monthly helper allowance',
      date: daysAgoIso(12, 18),
      archived: false,
      createdAt: daysAgoIso(12, 18),
    },
    {
      id: 'exp_005',
      businessId: BUSINESS_ID,
      transactionId: 'tx_hist_exp3',
      title: 'Shopping Bags & Poly Pack',
      category: 'Packaging',
      amountPaisa: toPaisa(950),
      note: 'Grocery packaging supplies',
      date: daysAgoIso(15, 11),
      archived: false,
      createdAt: daysAgoIso(15, 11),
    },
  ];

  const reminders: ReminderRecord[] = [
    {
      id: 'rem_001',
      businessId: BUSINESS_ID,
      customerId: 'cust_001',
      customerName: 'Karim Grocery',
      customerPhone: '+8801711223344',
      amountPaisa: toPaisa(14500),
      dueDate: daysAheadDate(3),
      channel: 'WhatsApp',
      message: 'আসসালামু আলাইকুম Karim Grocery, Sohel General Store-এ আপনার বর্তমান বকেয়া ৳14,500। অনুগ্রহ করে সুবিধামতো পরিশোধ করবেন। ধন্যবাদ।',
      status: 'Scheduled',
      createdAt: daysAgoIso(1, 10),
    },
    {
      id: 'rem_002',
      businessId: BUSINESS_ID,
      customerId: 'cust_003',
      customerName: 'Ayesha Boutique',
      customerPhone: '+8801913445566',
      amountPaisa: toPaisa(9800),
      dueDate: daysAheadDate(2),
      channel: 'SMS',
      message: 'Dear Ayesha Boutique, gentle reminder from Sohel General Store regarding due balance of ৳9,800. Thank you!',
      status: 'Sent',
      sentAt: daysAgoIso(1, 14),
      replyNote: 'Customer replied: Will pay ৳5,000 via bKash tomorrow evening',
      repliedAt: daysAgoIso(0, 18),
      createdAt: daysAgoIso(2, 9),
    },
  ];

  const auditLogs: AuditLogRecord[] = [
    {
      id: 'aud_001',
      businessId: BUSINESS_ID,
      actorName: 'Sohel Ahmed',
      action: 'DEMO_INITIALIZED',
      entityType: 'BACKUP',
      entityId: BUSINESS_ID,
      summary: 'Initialized Sohel General Store ledger (125 customers, 18 suppliers, ৳85,500 receivable, ৳32,000 payable)',
      timestamp: nowIso,
    },
    {
      id: 'aud_002',
      businessId: BUSINESS_ID,
      actorName: 'Sohel Ahmed',
      action: 'CREATE_CREDIT',
      entityType: 'TRANSACTION',
      entityId: 'tx_001',
      summary: 'Gave ৳4,500 credit to Karim Grocery (Double-entry balanced)',
      timestamp: daysAgoIso(0, 9),
    },
    {
      id: 'aud_003',
      businessId: BUSINESS_ID,
      actorName: 'Sohel Ahmed',
      action: 'RECEIVE_PAYMENT',
      entityType: 'TRANSACTION',
      entityId: 'tx_002',
      summary: 'Received ৳6,000 payment from Rahman Telecom',
      timestamp: daysAgoIso(0, 11),
    },
  ];

  return {
    user: {
      id: USER_ID,
      phone: '+8801711000001',
      fullName: 'Sohel Ahmed',
      role: 'OWNER',
      createdAt: daysAgoIso(180),
    },
    business: {
      id: BUSINESS_ID,
      name: 'Sohel General Store',
      nameBn: 'সোহেল জেনারেল স্টোর',
      ownerName: 'Sohel Ahmed',
      phone: '+8801711000001',
      address: 'Shop 14, Mirpur-10 Bazar, Dhaka-1216',
      category: 'Grocery & General Retail',
      currency: 'BDT',
      createdAt: daysAgoIso(180),
    },
    members: [
      {
        id: 'mem_001',
        businessId: BUSINESS_ID,
        userId: USER_ID,
        name: 'Sohel Ahmed',
        phone: '+8801711000001',
        role: 'OWNER',
        active: true,
      },
      {
        id: 'mem_002',
        businessId: BUSINESS_ID,
        userId: 'usr_manager_01',
        name: 'Rafiqul Islam',
        phone: '+8801811000002',
        role: 'MANAGER',
        active: true,
      },
    ],
    customers,
    suppliers,
    accounts,
    transactions,
    ledgerEntries,
    expenses,
    reminders,
    attachments: [],
    auditLogs,
    syncQueue: [],
    settings: {
      language: 'en',
      theme: 'light',
      pinEnabled: false,
      pinCode: '1234',
      biometricEnabled: true,
      offlineMode: false,
      autoBackup: true,
      lastBackupAt: daysAgoIso(1, 22),
    },
  };
}
