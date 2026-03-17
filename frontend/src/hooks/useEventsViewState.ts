import { useState } from 'react';

export function useEventsViewState() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'ledger'>('schedule');
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [bandFilter, setBandFilter] = useState<'all' | number>('all');
  const [ledgerBandFilter, setLedgerBandFilter] = useState<'all' | number>('all');
  const [ledgerMode, setLedgerMode] = useState<'unpaid' | 'all'>('unpaid');
  const [bulkPayAmount, setBulkPayAmount] = useState('');
  const [bulkPayStatus, setBulkPayStatus] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<'view' | 'timeline' | 'band' | null>(null);
  const [menuCloseTimer, setMenuCloseTimer] = useState<number | null>(null);

  return {
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    bandFilter,
    setBandFilter,
    ledgerBandFilter,
    setLedgerBandFilter,
    ledgerMode,
    setLedgerMode,
    bulkPayAmount,
    setBulkPayAmount,
    bulkPayStatus,
    setBulkPayStatus,
    openMenu,
    setOpenMenu,
    menuCloseTimer,
    setMenuCloseTimer,
  };
}

