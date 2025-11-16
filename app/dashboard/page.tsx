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
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* 1st row: money + conversion */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {/* Kelishuv summasi */}
          <Card title="KELISHUV SUMMASI">
            <div className="text-2xl font-semibold tracking-wide">
              {formatCurrency(totalWon)}
            </div>
          </Card>

          {/* Sotuv – Online */}
          <Card title="SOTUV — ONLINE">
            <div className="text-3xl font-semibold leading-tight">
              {onlineCount ?? 0}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              Kelishuvlar soni
            </div>
            <div className="mt-3 text-sm font-medium text-slate-100">
              {formatCurrency(onlineSum)}
            </div>
          </Card>

          {/* Sotuv – Offline */}
          <Card title="SOTUV — OFFLINE">
            <div className="text-3xl font-semibold leading-tight">
              {offlineCount ?? 0}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              Kelishuvlar soni
            </div>
            <div className="mt-3 text-sm font-medium text-slate-100">
              {formatCurrency(offlineSum)}
            </div>
          </Card>

          {/* Conversion */}
          <Card title="KONVERSIYA (QUALIFIED → SOTUV)">
            <div className="text-3xl font-semibold">
              {conversion.toFixed(1)}%
            </div>
          </Card>
        </div>

        {/* 2nd row: leads metrics */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card title="LIDLAR SONI">
            <BigNumber value={leadsCount} />
          </Card>

          <Card title="SIFATLI LIDLAR">
            <BigNumber value={qualifiedCount} />
          </Card>

          <Card title="SIFATSIZ LIDLAR">
            <BigNumber value={notQualifiedCount} />
          </Card>
        </div>

        {/* 3rd row: two pie charts */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card title="Sifatsiz lidlar sabablari">
            {nonQualifiedReasons.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nonQualifiedReasons}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {nonQualifiedReasons.map((_, index) => (
                        <Cell
                          key={index}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        value,
                        name as string,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Lid manbalari (Qayerdan)">
            {leadSources.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSources}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {leadSources.map((_, index) => (
                        <Cell
                          key={index}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        value,
                        name as string,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Revenue block */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Oylik tushum">
            <div className="text-xl font-semibold">
              {formatCurrency(monthlyRevenue)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Hozircha Google Sheets bo‘yicha yoki eski hisob-kitob bo‘yicha
            </div>
          </Card>

          <Card title="Haftalik tushum">
            <div className="text-xl font-semibold">
              {formatCurrency(weeklyRevenue)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Hozircha Google Sheets bo‘yicha yoki eski hisob-kitob bo‘yicha
            </div>
          </Card>
        </div>

        {loading && (
          <div className="mt-6 text-center text-xs text-slate-400">
            Yuklanmoqda...
          </div>
        )}
      </main>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {props.title}
      </div>
      <div className="mt-3 text-sm text-slate-100">{props.children}</div>
    </div>
  );
}

function BigNumber({ value }: { value: number }) {
  return (
    <div className="text-4xl font-semibold tracking-wide text-slate-50">
      {value}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-slate-400">
      Hozircha ma’lumot yo‘q.
    </div>
  );
}
