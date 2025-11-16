'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type PeriodKey = 'today' | 'week' | 'month' | 'custom';

type PieItem = {
  name: string;
  value: number;
};

type DashboardData = {
  // existing fields you already have
  periodLabel: string;
  wonSum: number;
  onlineSum: number;
  offlineSum: number;
  conversion: number;
  leadsCount: number;
  qualifiedLeads: number;
  notQualifiedLeads: number;

  // optional / new fields (all are safe even if backend doesn’t send them yet)
  onlineDealsCount?: number;
  offlineDealsCount?: number;

  weeklyRevenue?: number;
  monthlyRevenue?: number;
  weeklyRevenueFromSheets?: number;
  monthlyRevenueFromSheets?: number;

  nonQualifiedReasons?: PieItem[];
  leadSources?: PieItem[];
};

const PIE_COLORS = ['#22c55e', '#f97316', '#3b82f6', '#eab308', '#ef4444', '#a855f7'];

function formatCurrency(value: number): string {
  if (!value) return 'UZS 0';
  // simple thousands separator
  return (
    'UZS ' +
    value
      .toFixed(0)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (selectedPeriod: PeriodKey, from?: string, to?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('period', selectedPeriod);
      if (selectedPeriod === 'custom' && from && to) {
        params.set('from', from);
        params.set('to', to);
      }

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load (today)
    loadData('today');
  }, []);

  const handlePeriodClick = (next: PeriodKey) => {
    setPeriod(next);
    if (next === 'custom') {
      if (fromDate && toDate) {
        loadData('custom', fromDate, toDate);
      }
    } else {
      loadData(next);
    }
  };

  const handleCustomApply = () => {
    if (!fromDate || !toDate) return;
    setPeriod('custom');
    loadData('custom', fromDate, toDate);
  };

  const periodLabel = data?.periodLabel ?? 'Bugun';

  const totalWon = data?.wonSum ?? 0;
  const onlineSum = data?.onlineSum ?? 0;
  const offlineSum = data?.offlineSum ?? 0;
  const onlineCount = data?.onlineDealsCount ?? null;
  const offlineCount = data?.offlineDealsCount ?? null;

  const conversion = data?.conversion ?? 0;
  const leadsCount = data?.leadsCount ?? 0;
  const qualifiedCount = data?.qualifiedLeads ?? 0;
  const notQualifiedCount = data?.notQualifiedLeads ?? 0;

  // Revenue: prefer *FromSheets* if backend provides it, otherwise fallback to old fields
  const weeklyRevenue =
    data?.weeklyRevenueFromSheets ??
    data?.weeklyRevenue ??
    0;
  const monthlyRevenue =
    data?.monthlyRevenueFromSheets ??
    data?.monthlyRevenue ??
    totalWon; // fallback: total won this month

  const nonQualifiedReasons = data?.nonQualifiedReasons ?? [];
  const leadSources = data?.leadSources ?? [];

  return (
    <div className="min-h-screen bg-black text-slate-50">
      {/* top navigation bar (same as main layout look) */}
      <header className="border-b border-slate-800 bg-[#111827]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-wide">
            Najot Nur Sales Dashboard
          </div>
          <div className="text-sm text-slate-300">
            Davr: <span className="font-medium text-white">{periodLabel}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6">
        {/* period selector */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {[
              { key: 'today', label: 'Bugun' },
              { key: 'week', label: 'Bu hafta' },
              { key: 'month', label: 'Bu oy' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePeriodClick(key as PeriodKey)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
                  period === key
                    ? 'bg-white text-black border-white'
                    : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-xs text-slate-400">–</span>
            <input
              type="date"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <button
              onClick={handleCustomApply}
              className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-black hover:bg-sky-400"
            >
              Tanlash
            </
