/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AppShell } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { LedgerView } from './components/LedgerView';
import { MoreView } from './components/MoreView';
import { PeopleView } from './components/PeopleView';
import { PersonLedgerModal } from './components/PersonLedgerModal';
import { PinLockOverlay } from './components/PinLockOverlay';
import { ReportsView } from './components/ReportsView';
import { StatementPrintModal } from './components/StatementPrintModal';
import { TransactionModal, TransactionModalMode } from './components/TransactionModal';
import { useBookkeepingStore } from './store/useBookkeepingStore';
import { AppTab } from './types/bookkeeping';

export default function App() {
  const store = useBookkeepingStore();
  const { db, metrics, isLocked, setIsLocked } = store;
  const lang = db.settings.language;

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalMode, setTxModalMode] = useState<TransactionModalMode>('CUSTOMER_CREDIT');
  const [txPreselectedPartyId, setTxPreselectedPartyId] = useState<string | undefined>(undefined);

  const [addContactModalOpen, setAddContactModalOpen] = useState(false);

  const [inspectedPerson, setInspectedPerson] = useState<{
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER';
  } | null>(null);

  const [statementOpen, setStatementOpen] = useState(false);

  const openTxModal = (mode: TransactionModalMode, partyId?: string) => {
    setTxModalMode(mode);
    setTxPreselectedPartyId(partyId);
    setTxModalOpen(true);
  };

  const activeCustomer =
    inspectedPerson?.type === 'CUSTOMER'
      ? db.customers.find((c) => c.id === inspectedPerson.id) ?? null
      : null;

  const activeSupplier =
    inspectedPerson?.type === 'SUPPLIER'
      ? db.suppliers.find((s) => s.id === inspectedPerson.id) ?? null
      : null;

  const currentPerson = activeCustomer ?? activeSupplier;

  return (
    <>
      {isLocked && db.settings.pinEnabled && (
        <PinLockOverlay
          expectedPin={db.settings.pinCode}
          shopName={lang === 'bn' ? db.business.nameBn : db.business.name}
          lang={lang}
          onUnlock={() => setIsLocked(false)}
        />
      )}

      <AppShell
        activeTab={activeTab}
        lang={lang}
        offlineMode={db.settings.offlineMode}
        pendingSyncCount={metrics.pendingSyncCount}
        onSelectTab={setActiveTab}
        onNewEntry={() => openTxModal('CUSTOMER_CREDIT')}
      >
        {activeTab === 'home' && (
          <DashboardView
            business={db.business}
            metrics={metrics}
            transactions={db.transactions}
            lang={lang}
            onOpenTxModal={(mode) => openTxModal(mode)}
            onNavigateTab={setActiveTab}
            onOpenAddCustomer={() => {
              setActiveTab('people');
              setAddContactModalOpen(true);
            }}
            onRunGuidedDemo={store.runGuidedDemoFlow}
            onInspectCustomer={(customer) =>
              setInspectedPerson({ id: customer.id, type: 'CUSTOMER' })
            }
            onResetDemo={store.resetDemoData}
          />
        )}

        {activeTab === 'people' && (
          <PeopleView
            customers={db.customers}
            suppliers={db.suppliers}
            lang={lang}
            addModalOpen={addContactModalOpen}
            onSetAddModalOpen={setAddContactModalOpen}
            onAddCustomer={store.addCustomer}
            onAddSupplier={store.addSupplier}
            onSelectCustomer={(customer) =>
              setInspectedPerson({ id: customer.id, type: 'CUSTOMER' })
            }
            onSelectSupplier={(supplier) =>
              setInspectedPerson({ id: supplier.id, type: 'SUPPLIER' })
            }
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerView
            transactions={db.transactions}
            ledgerEntries={db.ledgerEntries}
            expenses={db.expenses}
            attachments={db.attachments}
            auditLogs={db.auditLogs}
            lang={lang}
            onOpenTxModal={(mode) => openTxModal(mode)}
            onReverseTx={store.reverseTransaction}
            onToggleArchiveExpense={store.toggleArchiveExpense}
          />
        )}

        {activeTab === 'reminders' && (
          <ReportsView
            shopName={lang === 'bn' ? db.business.nameBn : db.business.name}
            customers={db.customers}
            suppliers={db.suppliers}
            transactions={db.transactions}
            expenses={db.expenses}
            reminders={db.reminders}
            lang={lang}
            onAddReminder={store.addReminder}
            onMarkReminderSent={store.markReminderSent}
            onAddReminderReply={store.addReminderReply}
            onOpenPrintStatement={() => {
              setInspectedPerson(null);
              setStatementOpen(true);
            }}
          />
        )}

        {activeTab === 'more' && (
          <MoreView
            business={db.business}
            members={db.members}
            settings={db.settings}
            syncQueue={db.syncQueue}
            fullDatabaseExport={db}
            lang={lang}
            onSetLanguage={store.setLanguage}
            onSetTheme={store.setTheme}
            onUpdateSettings={store.updateSettings}
            onUpdateBusiness={store.updateBusiness}
            onSyncNow={store.syncPendingQueue}
            onLockNow={() => setIsLocked(true)}
            onImportBackup={store.importBackupJson}
            onResetDemo={store.resetDemoData}
          />
        )}
      </AppShell>

      <TransactionModal
        open={txModalOpen}
        initialMode={txModalMode}
        preselectedPartyId={txPreselectedPartyId}
        customers={db.customers}
        suppliers={db.suppliers}
        lang={lang}
        onClose={() => setTxModalOpen(false)}
        onSavePartyTx={store.recordTransaction}
        onSaveExpense={store.recordExpense}
      />

      <PersonLedgerModal
        person={currentPerson}
        type={inspectedPerson?.type ?? 'CUSTOMER'}
        transactions={db.transactions}
        lang={lang}
        shopName={lang === 'bn' ? db.business.nameBn : db.business.name}
        onClose={() => setInspectedPerson(null)}
        onSavePartyTx={store.recordTransaction}
        onUpdatePerson={(id, patch) => {
          if (inspectedPerson?.type === 'CUSTOMER') {
            store.updateCustomer(id, patch);
          } else {
            store.updateSupplier(id, patch);
          }
        }}
        onToggleArchive={(id) => {
          if (inspectedPerson?.type === 'CUSTOMER') {
            store.toggleArchiveCustomer(id);
          } else {
            store.toggleArchiveSupplier(id);
          }
        }}
        onReverseTx={store.reverseTransaction}
        onOpenStatement={() => setStatementOpen(true)}
        onSendReminder={store.addReminder}
      />

      <StatementPrintModal
        open={statementOpen}
        business={db.business}
        person={currentPerson}
        personType={inspectedPerson?.type}
        transactions={db.transactions}
        totalReceivablePaisa={metrics.totalReceivablePaisa}
        totalPayablePaisa={metrics.totalPayablePaisa}
        lang={lang}
        onClose={() => setStatementOpen(false)}
      />
    </>
  );
}
