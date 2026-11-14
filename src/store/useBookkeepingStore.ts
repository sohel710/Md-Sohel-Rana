import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDemoSeed } from '../data/demoSeed';
import {
  AppSettings,
  AttachmentRecord,
  AuditLogRecord,
  BusinessRecord,
  CustomerRecord,
  DueNoteDatabase,
  ExpenseCategory,
  ExpenseRecord,
  Language,
  LedgerEntryRecord,
  ReminderChannel,
  ReminderRecord,
  SupplierRecord,
  SyncQueueItem,
  ThemeMode,
  TransactionRecord,
} from '../types/bookkeeping';
import { formatTaka, toPaisa } from '../utils/currency';

const STORAGE_KEY = 'duenote_offline_db_v1';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadDatabase(): DueNoteDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DueNoteDatabase;
      if (parsed && parsed.business && Array.isArray(parsed.customers)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to clean demo seed
  }
  return createDemoSeed();
}

export function useBookkeepingStore() {
  const [db, setDb] = useState<DueNoteDatabase>(loadDatabase);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const initial = loadDatabase();
    return initial.settings.pinEnabled;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [db]);

  useEffect(() => {
    const root = document.documentElement;
    if (db.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [db.settings.theme]);

  const metrics = useMemo(() => {
    const activeCustomers = db.customers.filter((c) => !c.archived);
    const activeSuppliers = db.suppliers.filter((s) => !s.archived);
    const totalReceivablePaisa = activeCustomers.reduce((sum, c) => sum + Math.max(0, c.balancePaisa), 0);
    const totalPayablePaisa = activeSuppliers.reduce((sum, s) => sum + Math.max(0, s.balancePaisa), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    let todayReceivedPaisa = 0;
    let todayGivenPaisa = 0;

    db.transactions.forEach((tx) => {
      if (tx.reversedByTxId) return;
      if (tx.date.startsWith(todayStr)) {
        if (tx.kind === 'CUSTOMER_PAYMENT') {
          todayReceivedPaisa += tx.amountPaisa;
        } else if (tx.kind === 'CUSTOMER_CREDIT' || tx.kind === 'EXPENSE' || tx.kind === 'SUPPLIER_PAYMENT') {
          todayGivenPaisa += tx.amountPaisa;
        }
      }
    });

    const totalExpensesPaisa = db.expenses
      .filter((e) => !e.archived)
      .reduce((sum, e) => sum + e.amountPaisa, 0);

    return {
      customerCount: activeCustomers.length,
      supplierCount: activeSuppliers.length,
      totalReceivablePaisa,
      totalPayablePaisa,
      netPositionPaisa: totalReceivablePaisa - totalPayablePaisa,
      todayReceivedPaisa,
      todayGivenPaisa,
      totalExpensesPaisa,
      pendingSyncCount: db.syncQueue.filter((q) => q.status === 'pending').length,
    };
  }, [db]);

  const addCustomer = useCallback(
    (input: { name: string; phone: string; address: string; openingBalanceTaka: number }) => {
      const now = new Date().toISOString();
      const openingPaisa = toPaisa(Math.max(0, input.openingBalanceTaka));
      const newCustomer: CustomerRecord = {
        id: uid('cust'),
        businessId: db.business.id,
        name: input.name.trim(),
        phone: input.phone.trim(),
        address: input.address.trim() || 'Dhaka, Bangladesh',
        openingBalancePaisa: openingPaisa,
        balancePaisa: openingPaisa,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };

      setDb((prev) => {
        const syncItem: SyncQueueItem | null = prev.settings.offlineMode
          ? { id: uid('sync'), entityType: 'CUSTOMER', entityId: newCustomer.id, operation: 'INSERT', status: 'pending', queuedAt: now }
          : null;
        const audit: AuditLogRecord = {
          id: uid('aud'),
          businessId: prev.business.id,
          actorName: prev.user.fullName,
          action: 'ADD_CUSTOMER',
          entityType: 'CUSTOMER',
          entityId: newCustomer.id,
          summary: `Added customer ${newCustomer.name} (Opening: ${formatTaka(openingPaisa)})`,
          timestamp: now,
        };
        return {
          ...prev,
          customers: [newCustomer, ...prev.customers],
          auditLogs: [audit, ...prev.auditLogs],
          syncQueue: syncItem ? [syncItem, ...prev.syncQueue] : prev.syncQueue,
        };
      });

      return newCustomer;
    },
    [db.business.id]
  );

  const updateCustomer = useCallback(
    (id: string, patch: { name: string; phone: string; address: string }) => {
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === id ? { ...c, name: patch.name.trim(), phone: patch.phone.trim(), address: patch.address.trim(), updatedAt: now } : c
        ),
        auditLogs: [
          {
            id: uid('aud'),
            businessId: prev.business.id,
            actorName: prev.user.fullName,
            action: 'UPDATE_CUSTOMER',
            entityType: 'CUSTOMER',
            entityId: id,
            summary: `Updated customer profile: ${patch.name.trim()}`,
            timestamp: now,
          },
          ...prev.auditLogs,
        ],
      }));
    },
    []
  );

  const toggleArchiveCustomer = useCallback((id: string) => {
    const now = new Date().toISOString();
    setDb((prev) => {
      const target = prev.customers.find((c) => c.id === id);
      if (!target) return prev;
      const nextArchived = !target.archived;
      return {
        ...prev,
        customers: prev.customers.map((c) => (c.id === id ? { ...c, archived: nextArchived, updatedAt: now } : c)),
        auditLogs: [
          {
            id: uid('aud'),
            businessId: prev.business.id,
            actorName: prev.user.fullName,
            action: nextArchived ? 'ARCHIVE_CUSTOMER' : 'RESTORE_CUSTOMER',
            entityType: 'CUSTOMER',
            entityId: id,
            summary: `${nextArchived ? 'Archived' : 'Restored'} customer ${target.name}`,
            timestamp: now,
          },
          ...prev.auditLogs,
        ],
      };
    });
  }, []);

  const addSupplier = useCallback(
    (input: { name: string; phone: string; address: string; openingBalanceTaka: number }) => {
      const now = new Date().toISOString();
      const openingPaisa = toPaisa(Math.max(0, input.openingBalanceTaka));
      const newSupplier: SupplierRecord = {
        id: uid('supp'),
        businessId: db.business.id,
        name: input.name.trim(),
        phone: input.phone.trim(),
        address: input.address.trim() || 'Dhaka, Bangladesh',
        openingBalancePaisa: openingPaisa,
        balancePaisa: openingPaisa,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };

      setDb((prev) => {
        const syncItem: SyncQueueItem | null = prev.settings.offlineMode
          ? { id: uid('sync'), entityType: 'SUPPLIER', entityId: newSupplier.id, operation: 'INSERT', status: 'pending', queuedAt: now }
          : null;
        return {
          ...prev,
          suppliers: [newSupplier, ...prev.suppliers],
          auditLogs: [
            {
              id: uid('aud'),
              businessId: prev.business.id,
              actorName: prev.user.fullName,
              action: 'ADD_SUPPLIER',
              entityType: 'SUPPLIER',
              entityId: newSupplier.id,
              summary: `Added supplier ${newSupplier.name} (Opening payable: ${formatTaka(openingPaisa)})`,
              timestamp: now,
            },
            ...prev.auditLogs,
          ],
          syncQueue: syncItem ? [syncItem, ...prev.syncQueue] : prev.syncQueue,
        };
      });

      return newSupplier;
    },
    [db.business.id]
  );

  const updateSupplier = useCallback(
    (id: string, patch: { name: string; phone: string; address: string }) => {
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((s) =>
          s.id === id ? { ...s, name: patch.name.trim(), phone: patch.phone.trim(), address: patch.address.trim(), updatedAt: now } : s
        ),
      }));
    },
    []
  );

  const toggleArchiveSupplier = useCallback((id: string) => {
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => (s.id === id ? { ...s, archived: !s.archived, updatedAt: now } : s)),
    }));
  }, []);

  const recordTransaction = useCallback(
    (input: {
      kind: 'CUSTOMER_CREDIT' | 'CUSTOMER_PAYMENT' | 'SUPPLIER_PURCHASE' | 'SUPPLIER_PAYMENT';
      partyId: string;
      amountTaka: number;
      note: string;
      date: string;
      dueDate?: string;
      attachment?: { fileName: string; mimeType: string; dataUrl: string };
    }) => {
      const amountPaisa = toPaisa(input.amountTaka);
      if (amountPaisa <= 0) return;

      const now = new Date().toISOString();
      const txId = uid('tx');

      setDb((prev) => {
        const isCustomer = input.kind === 'CUSTOMER_CREDIT' || input.kind === 'CUSTOMER_PAYMENT';
        const customer = isCustomer ? prev.customers.find((c) => c.id === input.partyId) : undefined;
        const supplier = !isCustomer ? prev.suppliers.find((s) => s.id === input.partyId) : undefined;
        const partyName = customer?.name ?? supplier?.name ?? 'Unknown Party';

        let attachmentRecord: AttachmentRecord | undefined;
        if (input.attachment) {
          attachmentRecord = {
            id: uid('att'),
            transactionId: txId,
            fileName: input.attachment.fileName,
            mimeType: input.attachment.mimeType,
            dataUrl: input.attachment.dataUrl,
            createdAt: now,
          };
        }

        const tx: TransactionRecord = {
          id: txId,
          businessId: prev.business.id,
          kind: input.kind,
          partyType: isCustomer ? 'CUSTOMER' : 'SUPPLIER',
          partyId: input.partyId,
          partyName,
          amountPaisa,
          note: input.note.trim() || (isCustomer ? 'Khata transaction' : 'Supplier ledger entry'),
          date: input.date ? new Date(input.date).toISOString() : now,
          dueDate: input.dueDate || undefined,
          attachmentId: attachmentRecord?.id,
          syncStatus: prev.settings.offlineMode ? 'pending' : 'synced',
          createdBy: prev.user.fullName,
          createdAt: now,
        };

        // Balanced Double-Entry Accounting Ledger Entries
        const newLedgerEntries: LedgerEntryRecord[] = [];
        if (input.kind === 'CUSTOMER_CREDIT') {
          newLedgerEntries.push(
            { id: uid('le'), transactionId: txId, accountId: 'acc_ar', accountName: 'Accounts Receivable', debitPaisa: amountPaisa, creditPaisa: 0, createdAt: now },
            { id: uid('le'), transactionId: txId, accountId: 'acc_sales', accountName: 'Sales & Credit Revenue', debitPaisa: 0, creditPaisa: amountPaisa, createdAt: now }
          );
        } else if (input.kind === 'CUSTOMER_PAYMENT') {
          newLedgerEntries.push(
            { id: uid('le'), transactionId: txId, accountId: 'acc_cash', accountName: 'Cash in Hand', debitPaisa: amountPaisa, creditPaisa: 0, createdAt: now },
            { id: uid('le'), transactionId: txId, accountId: 'acc_ar', accountName: 'Accounts Receivable', debitPaisa: 0, creditPaisa: amountPaisa, createdAt: now }
          );
        } else if (input.kind === 'SUPPLIER_PURCHASE') {
          newLedgerEntries.push(
            { id: uid('le'), transactionId: txId, accountId: 'acc_exp', accountName: 'Inventory & Purchases', debitPaisa: amountPaisa, creditPaisa: 0, createdAt: now },
            { id: uid('le'), transactionId: txId, accountId: 'acc_ap', accountName: 'Accounts Payable', debitPaisa: 0, creditPaisa: amountPaisa, createdAt: now }
          );
        } else if (input.kind === 'SUPPLIER_PAYMENT') {
          newLedgerEntries.push(
            { id: uid('le'), transactionId: txId, accountId: 'acc_ap', accountName: 'Accounts Payable', debitPaisa: amountPaisa, creditPaisa: 0, createdAt: now },
            { id: uid('le'), transactionId: txId, accountId: 'acc_cash', accountName: 'Cash in Hand', debitPaisa: 0, creditPaisa: amountPaisa, createdAt: now }
          );
        }

        const nextCustomers = isCustomer
          ? prev.customers.map((c) => {
              if (c.id !== input.partyId) return c;
              const delta = input.kind === 'CUSTOMER_CREDIT' ? amountPaisa : -amountPaisa;
              return {
                ...c,
                balancePaisa: c.balancePaisa + delta,
                dueDate: input.dueDate || c.dueDate,
                updatedAt: now,
              };
            })
          : prev.customers;

        const nextSuppliers = !isCustomer
          ? prev.suppliers.map((s) => {
              if (s.id !== input.partyId) return s;
              const delta = input.kind === 'SUPPLIER_PURCHASE' ? amountPaisa : -amountPaisa;
              return {
                ...s,
                balancePaisa: s.balancePaisa + delta,
                dueDate: input.dueDate || s.dueDate,
                updatedAt: now,
              };
            })
          : prev.suppliers;

        const syncItem: SyncQueueItem | null = prev.settings.offlineMode
          ? { id: uid('sync'), entityType: 'TRANSACTION', entityId: txId, operation: 'INSERT', status: 'pending', queuedAt: now }
          : null;

        const audit: AuditLogRecord = {
          id: uid('aud'),
          businessId: prev.business.id,
          actorName: prev.user.fullName,
          action: input.kind,
          entityType: 'TRANSACTION',
          entityId: txId,
          summary: `${input.kind.replace('_', ' ')}: ${formatTaka(amountPaisa)} with ${partyName}`,
          timestamp: now,
        };

        return {
          ...prev,
          customers: nextCustomers,
          suppliers: nextSuppliers,
          transactions: [tx, ...prev.transactions],
          ledgerEntries: [...newLedgerEntries, ...prev.ledgerEntries],
          attachments: attachmentRecord ? [attachmentRecord, ...prev.attachments] : prev.attachments,
          auditLogs: [audit, ...prev.auditLogs],
          syncQueue: syncItem ? [syncItem, ...prev.syncQueue] : prev.syncQueue,
        };
      });
    },
    []
  );

  const recordExpense = useCallback(
    (input: { title: string; category: ExpenseCategory; amountTaka: number; note: string; date: string }) => {
      const amountPaisa = toPaisa(input.amountTaka);
      if (amountPaisa <= 0) return;

      const now = new Date().toISOString();
      const txId = uid('tx');
      const expId = uid('exp');
      const occurredAt = input.date ? new Date(input.date).toISOString() : now;

      setDb((prev) => {
        const tx: TransactionRecord = {
          id: txId,
          businessId: prev.business.id,
          kind: 'EXPENSE',
          partyType: 'BUSINESS',
          partyName: input.title.trim(),
          amountPaisa,
          note: `${input.category} — ${input.note.trim() || 'Shop expense'}`,
          date: occurredAt,
          syncStatus: prev.settings.offlineMode ? 'pending' : 'synced',
          createdBy: prev.user.fullName,
          createdAt: now,
        };

        const exp: ExpenseRecord = {
          id: expId,
          businessId: prev.business.id,
          transactionId: txId,
          title: input.title.trim(),
          category: input.category,
          amountPaisa,
          note: input.note.trim(),
          date: occurredAt,
          archived: false,
          createdAt: now,
        };

        const entries: LedgerEntryRecord[] = [
          { id: uid('le'), transactionId: txId, accountId: 'acc_exp', accountName: 'Operating Expenses', debitPaisa: amountPaisa, creditPaisa: 0, createdAt: now },
          { id: uid('le'), transactionId: txId, accountId: 'acc_cash', accountName: 'Cash in Hand', debitPaisa: 0, creditPaisa: amountPaisa, createdAt: now },
        ];

        const syncItem: SyncQueueItem | null = prev.settings.offlineMode
          ? { id: uid('sync'), entityType: 'EXPENSE', entityId: expId, operation: 'INSERT', status: 'pending', queuedAt: now }
          : null;

        return {
          ...prev,
          transactions: [tx, ...prev.transactions],
          expenses: [exp, ...prev.expenses],
          ledgerEntries: [...entries, ...prev.ledgerEntries],
          auditLogs: [
            {
              id: uid('aud'),
              businessId: prev.business.id,
              actorName: prev.user.fullName,
              action: 'ADD_EXPENSE',
              entityType: 'EXPENSE',
              entityId: expId,
              summary: `Recorded expense "${exp.title}" (${exp.category}): ${formatTaka(amountPaisa)}`,
              timestamp: now,
            },
            ...prev.auditLogs,
          ],
          syncQueue: syncItem ? [syncItem, ...prev.syncQueue] : prev.syncQueue,
        };
      });
    },
    []
  );

  const toggleArchiveExpense = useCallback((id: string) => {
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === id ? { ...e, archived: !e.archived } : e)),
      auditLogs: [
        {
          id: uid('aud'),
          businessId: prev.business.id,
          actorName: prev.user.fullName,
          action: 'TOGGLE_ARCHIVE_EXPENSE',
          entityType: 'EXPENSE',
          entityId: id,
          summary: `Updated archive state for expense ${id}`,
          timestamp: now,
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const reverseTransaction = useCallback((txId: string, reason = 'Manual correction') => {
    const now = new Date().toISOString();
    setDb((prev) => {
      const orig = prev.transactions.find((t) => t.id === txId);
      if (!orig || orig.reversedByTxId || orig.kind === 'REVERSAL') return prev;

      const revId = uid('tx_rev');
      const revTx: TransactionRecord = {
        id: revId,
        businessId: prev.business.id,
        kind: 'REVERSAL',
        partyType: orig.partyType,
        partyId: orig.partyId,
        partyName: orig.partyName,
        amountPaisa: orig.amountPaisa,
        note: `Reversal of ${orig.id}: ${reason}`,
        date: now,
        reversesTxId: orig.id,
        syncStatus: prev.settings.offlineMode ? 'pending' : 'synced',
        createdBy: prev.user.fullName,
        createdAt: now,
      };

      const origEntries = prev.ledgerEntries.filter((le) => le.transactionId === orig.id);
      const revEntries: LedgerEntryRecord[] = origEntries.map((le) => ({
        id: uid('le'),
        transactionId: revId,
        accountId: le.accountId,
        accountName: le.accountName,
        debitPaisa: le.creditPaisa,
        creditPaisa: le.debitPaisa,
        createdAt: now,
      }));

      const nextCustomers =
        orig.partyType === 'CUSTOMER' && orig.partyId
          ? prev.customers.map((c) => {
              if (c.id !== orig.partyId) return c;
              const reverseDelta = orig.kind === 'CUSTOMER_CREDIT' ? -orig.amountPaisa : orig.amountPaisa;
              return { ...c, balancePaisa: c.balancePaisa + reverseDelta, updatedAt: now };
            })
          : prev.customers;

      const nextSuppliers =
        orig.partyType === 'SUPPLIER' && orig.partyId
          ? prev.suppliers.map((s) => {
              if (s.id !== orig.partyId) return s;
              const reverseDelta = orig.kind === 'SUPPLIER_PURCHASE' ? -orig.amountPaisa : orig.amountPaisa;
              return { ...s, balancePaisa: s.balancePaisa + reverseDelta, updatedAt: now };
            })
          : prev.suppliers;

      return {
        ...prev,
        customers: nextCustomers,
        suppliers: nextSuppliers,
        transactions: [
          revTx,
          ...prev.transactions.map((t) => (t.id === orig.id ? { ...t, reversedByTxId: revId } : t)),
        ],
        ledgerEntries: [...revEntries, ...prev.ledgerEntries],
        auditLogs: [
          {
            id: uid('aud'),
            businessId: prev.business.id,
            actorName: prev.user.fullName,
            action: 'REVERSE_TRANSACTION',
            entityType: 'TRANSACTION',
            entityId: orig.id,
            summary: `Reversed ${orig.kind} (${formatTaka(orig.amountPaisa)}) for ${orig.partyName}. Reason: ${reason}`,
            timestamp: now,
          },
          ...prev.auditLogs,
        ],
      };
    });
  }, []);

  const addReminder = useCallback(
    (input: { customerId: string; dueDate: string; channel: ReminderChannel; message: string; sendImmediately?: boolean }) => {
      const now = new Date().toISOString();
      setDb((prev) => {
        const customer = prev.customers.find((c) => c.id === input.customerId);
        if (!customer) return prev;
        const reminder: ReminderRecord = {
          id: uid('rem'),
          businessId: prev.business.id,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          amountPaisa: customer.balancePaisa,
          dueDate: input.dueDate,
          channel: input.channel,
          message: input.message,
          status: input.sendImmediately ? 'Sent' : 'Scheduled',
          sentAt: input.sendImmediately ? now : undefined,
          createdAt: now,
        };
        return {
          ...prev,
          reminders: [reminder, ...prev.reminders],
          auditLogs: [
            {
              id: uid('aud'),
              businessId: prev.business.id,
              actorName: prev.user.fullName,
              action: 'CREATE_REMINDER',
              entityType: 'REMINDER',
              entityId: reminder.id,
              summary: `${input.channel} due reminder ${reminder.status.toLowerCase()} for ${customer.name} (${formatTaka(customer.balancePaisa)})`,
              timestamp: now,
            },
            ...prev.auditLogs,
          ],
        };
      });
    },
    []
  );

  const markReminderSent = useCallback((id: string) => {
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) => (r.id === id ? { ...r, status: 'Sent', sentAt: now } : r)),
    }));
  }, []);

  const addReminderReply = useCallback((id: string, replyNote: string) => {
    const trimmed = replyNote.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const target = prev.reminders.find((r) => r.id === id);
      return {
        ...prev,
        reminders: prev.reminders.map((r) =>
          r.id === id ? { ...r, replyNote: trimmed, repliedAt: now, status: 'Sent', sentAt: r.sentAt ?? now } : r
        ),
        auditLogs: target
          ? [
              {
                id: uid('aud'),
                businessId: prev.business.id,
                actorName: prev.user.fullName,
                action: 'LOG_REMINDER_REPLY',
                entityType: 'REMINDER',
                entityId: id,
                summary: `Logged reply from ${target.customerName}: "${trimmed}"`,
                timestamp: now,
              },
              ...prev.auditLogs,
            ]
          : prev.auditLogs,
      };
    });
  }, []);

  const runGuidedDemoFlow = useCallback((): CustomerRecord => {
    const now = new Date().toISOString();
    const custId = uid('cust_demo');
    const tx1Id = uid('tx_demo_1');
    const tx2Id = uid('tx_demo_2');

    const demoCustomer: CustomerRecord = {
      id: custId,
      businessId: db.business.id,
      name: 'Tanvir Enterprise (Demo)',
      phone: '+8801799887766',
      address: 'Mirpur-10, Dhaka',
      openingBalancePaisa: 0,
      balancePaisa: toPaisa(3000),
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    const txCredit: TransactionRecord = {
      id: tx1Id,
      businessId: db.business.id,
      kind: 'CUSTOMER_CREDIT',
      partyType: 'CUSTOMER',
      partyId: custId,
      partyName: demoCustomer.name,
      amountPaisa: toPaisa(5000),
      note: 'Demo: Gave ৳5,000 wholesale credit',
      date: now,
      syncStatus: db.settings.offlineMode ? 'pending' : 'synced',
      createdBy: db.user.fullName,
      createdAt: now,
    };

    const txPayment: TransactionRecord = {
      id: tx2Id,
      businessId: db.business.id,
      kind: 'CUSTOMER_PAYMENT',
      partyType: 'CUSTOMER',
      partyId: custId,
      partyName: demoCustomer.name,
      amountPaisa: toPaisa(2000),
      note: 'Demo: Received ৳2,000 partial payment',
      date: now,
      syncStatus: db.settings.offlineMode ? 'pending' : 'synced',
      createdBy: db.user.fullName,
      createdAt: now,
    };

    const entries: LedgerEntryRecord[] = [
      { id: uid('le'), transactionId: tx1Id, accountId: 'acc_ar', accountName: 'Accounts Receivable', debitPaisa: toPaisa(5000), creditPaisa: 0, createdAt: now },
      { id: uid('le'), transactionId: tx1Id, accountId: 'acc_sales', accountName: 'Sales & Credit Revenue', debitPaisa: 0, creditPaisa: toPaisa(5000), createdAt: now },
      { id: uid('le'), transactionId: tx2Id, accountId: 'acc_cash', accountName: 'Cash in Hand', debitPaisa: toPaisa(2000), creditPaisa: 0, createdAt: now },
      { id: uid('le'), transactionId: tx2Id, accountId: 'acc_ar', accountName: 'Accounts Receivable', debitPaisa: 0, creditPaisa: toPaisa(2000), createdAt: now },
    ];

    setDb((prev) => ({
      ...prev,
      customers: [demoCustomer, ...prev.customers],
      transactions: [txPayment, txCredit, ...prev.transactions],
      ledgerEntries: [...entries, ...prev.ledgerEntries],
      auditLogs: [
        {
          id: uid('aud'),
          businessId: prev.business.id,
          actorName: prev.user.fullName,
          action: 'GUIDED_DEMO_FLOW',
          entityType: 'CUSTOMER',
          entityId: custId,
          summary: 'Guided Demo: Added Tanvir Enterprise → Gave ৳5,000 credit → Received ৳2,000 → Remaining ৳3,000',
          timestamp: now,
        },
        ...prev.auditLogs,
      ],
    }));

    return demoCustomer;
  }, [db.business.id, db.settings.offlineMode, db.user.fullName]);

  const setLanguage = useCallback((language: Language) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, language } }));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, theme } }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const updateBusiness = useCallback((patch: Partial<BusinessRecord>) => {
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      business: { ...prev.business, ...patch },
      auditLogs: [
        {
          id: uid('aud'),
          businessId: prev.business.id,
          actorName: prev.user.fullName,
          action: 'UPDATE_BUSINESS_PROFILE',
          entityType: 'SECURITY',
          entityId: prev.business.id,
          summary: `Updated shop profile details`,
          timestamp: now,
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const syncPendingQueue = useCallback(() => {
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      settings: { ...prev.settings, offlineMode: false },
      transactions: prev.transactions.map((t) => ({ ...t, syncStatus: 'synced' })),
      syncQueue: [],
      auditLogs: [
        {
          id: uid('aud'),
          businessId: prev.business.id,
          actorName: prev.user.fullName,
          action: 'CLOUD_SYNC_COMPLETE',
          entityType: 'BACKUP',
          entityId: prev.business.id,
          summary: `Synchronized ${prev.syncQueue.length} offline records cleanly`,
          timestamp: now,
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const importBackupJson = useCallback((rawJson: string): boolean => {
    try {
      const parsed = JSON.parse(rawJson) as DueNoteDatabase;
      if (parsed && parsed.business && Array.isArray(parsed.customers) && Array.isArray(parsed.transactions)) {
        setDb(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createDemoSeed();
    setDb(fresh);
    setIsLocked(false);
  }, []);

  return {
    db,
    metrics,
    isLocked,
    setIsLocked,
    addCustomer,
    updateCustomer,
    toggleArchiveCustomer,
    addSupplier,
    updateSupplier,
    toggleArchiveSupplier,
    recordTransaction,
    recordExpense,
    toggleArchiveExpense,
    reverseTransaction,
    addReminder,
    markReminderSent,
    addReminderReply,
    runGuidedDemoFlow,
    setLanguage,
    setTheme,
    updateSettings,
    updateBusiness,
    syncPendingQueue,
    importBackupJson,
    resetDemoData,
  };
}
