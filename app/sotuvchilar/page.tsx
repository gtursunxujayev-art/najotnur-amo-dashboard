'use client';

import { useState, useEffect } from 'react';

type Period = 'today' | 'yesterday' | 'week' | 'lastweek' | 'month' | 'lastmonth' | 'custom';

interface ManagerStats {
  name: string;
  activeLeads: number;
  newLeads: number;
  sales: number;
  qualifiedLeads: number;
  nonQualifiedLeads: number;
  conversionToQualified: number;
  conversionToAllLeads: number;
  totalCalls: number;
  totalCallLength: number;
  dailyAvgCalls: number;
  dailyAvgCallLength: number;
  revenue: number;
  lostLeadReasons: { reason: string; count: number }[];
}

interface SummaryStats {
  managers: ManagerStats[];
}

export default function SotuvchilarPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchStats();
  }, [period, customStartDate, customEndDate]);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        period,
        ...(period === 'custom' && customStartDate && { start: customStartDate }),
        ...(period === 'custom' && customEndDate && { end: customEndDate }),
      });

      const res = await fetch(`/api/sotuvchilar/stats?${params}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
      if (data.managers.length > 0 && !selectedManager) {
        setSelectedManager(data.managers[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const selectedManagerData = stats?.managers.find((m) => m.name === selectedManager);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="text-3xl font-bold text-white">Sotuvchilar</h1>

        {/* Period Selection */}
        <div className="flex flex-wrap gap-2 rounded-lg bg-slate-800/50 p-3">
          {(['today', 'yesterday', 'week', 'lastweek', 'month', 'lastmonth', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              {p === 'today'
                ? 'Bugun'
                : p === 'yesterday'
                  ? 'Kecha'
                  : p === 'week'
                    ? 'Bu hafta'
                    : p === 'lastweek'
                      ? "O'tgan hafta"
                      : p === 'month'
                        ? 'Bu oy'
                        : p === 'lastmonth'
                          ? "O'tgan oy"
                          : 'Maxsus davr'}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        {period === 'custom' && (
          <div className="flex gap-4 rounded-lg bg-slate-800/50 p-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">Boshlang'ich sana</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full rounded bg-slate-700 px-3 py-2 text-slate-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">Tugash sanasi</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full rounded bg-slate-700 px-3 py-2 text-slate-200"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-900/30 p-4 text-red-300">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-slate-300">Yuklanmoqda...</div>
        ) : stats ? (
          <>
            {/* Summary Table */}
            <div className="overflow-x-auto rounded-lg bg-slate-800/50 p-4">
              <table className="w-full text-left text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-3 py-2">Xodim</th>
                    <th className="px-3 py-2 text-center">Faol lidlar</th>
                    <th className="px-3 py-2 text-center">Yangi lidlar</th>
                    <th className="px-3 py-2 text-center">Sotuvlar</th>
                    <th className="px-3 py-2 text-center">Konversiya</th>
                    <th className="px-3 py-2 text-center">Konversiya umumiy</th>
                    <th className="px-3 py-2 text-center">Qo'ng'iroqlar</th>
                    <th className="px-3 py-2 text-center">Davomiylifi</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.managers.map((manager) => (
                    <tr
                      key={manager.name}
                      onClick={() => setSelectedManager(manager.name)}
                      className={`border-b border-slate-700 cursor-pointer transition-colors ${
                        selectedManager === manager.name
                          ? 'bg-blue-900/30'
                          : 'hover:bg-slate-700/50'
                      }`}
                    >
                      <td className="px-3 py-2 font-semibold">{manager.name}</td>
                      <td className="px-3 py-2 text-center">{manager.activeLeads}</td>
                      <td className="px-3 py-2 text-center">{manager.newLeads}</td>
                      <td className="px-3 py-2 text-center">{manager.sales}</td>
                      <td className="px-3 py-2 text-center">{manager.conversionToQualified.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">{manager.conversionToAllLeads.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">{manager.totalCalls}</td>
                      <td className="px-3 py-2 text-center">{formatDuration(manager.totalCallLength)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Manager Dropdown and Details */}
            {selectedManagerData && (
              <div className="space-y-6">
                {/* Manager Selection */}
                <div className="flex gap-4 rounded-lg bg-slate-800/50 p-4">
                  <div className="flex-1">
                    <label className="block text-sm text-slate-300 mb-2">Sotuvchini tanlang</label>
                    <select
                      value={selectedManager}
                      onChange={(e) => setSelectedManager(e.target.value)}
                      className="w-full rounded bg-slate-700 px-3 py-2 text-slate-200"
                    >
                      {stats.managers.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Detailed Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    {
                      label: 'Tushum',
                      value: `${(selectedManagerData.revenue).toLocaleString()}`,
                    },
                    { label: 'Faol lidlar', value: selectedManagerData.activeLeads },
                    { label: 'Yangi lidlar', value: selectedManagerData.newLeads },
                    { label: 'Sotuvlar', value: selectedManagerData.sales },
                    {
                      label: 'Sifatli lid',
                      value: selectedManagerData.qualifiedLeads,
                    },
                    {
                      label: 'Sifatsizlid',
                      value: selectedManagerData.nonQualifiedLeads,
                    },
                    {
                      label: 'Konversiya',
                      value: `${selectedManagerData.conversionToQualified.toFixed(1)}%`,
                    },
                    {
                      label: 'Konversiya umumiy',
                      value: `${selectedManagerData.conversionToAllLeads.toFixed(1)}%`,
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-800/50 p-4">
                      <p className="text-xs text-slate-400">{item.label}</p>
                      <p className="text-2xl font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Call Information */}
                <div className="rounded-lg bg-slate-800/50 p-4">
                  <h3 className="mb-4 text-lg font-semibold text-white">Qo'ng'iroq ma'lumotlari</h3>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-400">Jami qo'ng'iroqlar</p>
                      <p className="text-2xl font-bold text-white">{selectedManagerData.totalCalls}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Kunlik o'rtacha</p>
                      <p className="text-2xl font-bold text-white">{selectedManagerData.dailyAvgCalls.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Qo'ng'iroqlardavomiyligi</p>
                      <p className="text-2xl font-bold text-white">
                        {formatDuration(selectedManagerData.totalCallLength)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">O'rtacha Kunlik</p>
                      <p className="text-2xl font-bold text-white">
                        {formatDuration(selectedManagerData.dailyAvgCallLength)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lost Leads by Reason */}
                {selectedManagerData.lostLeadReasons.length > 0 && (
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <h3 className="mb-4 text-lg font-semibold text-white">Sotib olmaslik sabablari</h3>
                    <div className="space-y-2">
                      {selectedManagerData.lostLeadReasons.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-slate-700 pb-2">
                          <span className="text-slate-300">{item.reason}</span>
                          <span className="font-semibold text-white">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
