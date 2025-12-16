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
  averageReachTime: number;
  completedFollowUps: number;
  lostLeadReasons: { reason: string; count: number }[];
}

interface SummaryStats {
  managers: ManagerStats[];
}

interface ResponseStats {
  manager: string;
  totalNotifications: number;
  totalResponses: number;
  avgResponseTimeMs: number;
}

export default function SotuvchilarPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [responseStats, setResponseStats] = useState<ResponseStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchStats();
  }, [period, customStartDate, customEndDate]);

  useEffect(() => {
    if (selectedManager) {
      fetchResponseStats();
    }
  }, [period, customStartDate, customEndDate, selectedManager]);

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
      
      // Set or reset selected manager when data changes
      if (data.managers.length > 0) {
        const currentExists = data.managers.some((m: ManagerStats) => m.name === selectedManager);
        if (!selectedManager || !currentExists) {
          setSelectedManager(data.managers[0].name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchResponseStats = async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedManager) {
        params.set('manager', selectedManager);
      }
      
      if (period === 'custom' && customStartDate && customEndDate) {
        params.set('from', customStartDate);
        params.set('to', customEndDate);
      } else {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let fromDate: Date, toDate: Date;

        switch (period) {
          case 'today':
            fromDate = today;
            toDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'yesterday':
            fromDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            toDate = today;
            break;
          case 'week':
            const dayOfWeek = now.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            fromDate = monday;
            toDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'lastweek':
            const lastMonday = new Date(today);
            lastMonday.setDate(today.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) - 7);
            fromDate = lastMonday;
            toDate = new Date(lastMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            toDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'lastmonth':
            fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            toDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            toDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        }

        params.set('from', fromDate.toISOString());
        params.set('to', toDate.toISOString());
      }

      const res = await fetch(`/api/response-stats?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResponseStats(data.stats || []);
      }
    } catch (err) {
      console.error('Failed to fetch response stats:', err);
    }
  };

  const formatResponseTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
                    <th className="px-3 py-2 text-center">Qayta aloqa</th>
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
                      <td className="px-3 py-2 text-center">{manager.completedFollowUps}</td>
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
                      label: 'Sifatsiz lidlar',
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
                    {
                      label: "O'rtacha erishish vaqti",
                      value: selectedManagerData.averageReachTime > 0 ? `${selectedManagerData.averageReachTime} min` : 'N/A',
                    },
                    {
                      label: 'Bajarilgan qayta aloqa',
                      value: selectedManagerData.completedFollowUps,
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
                      <p className="text-2xl font-bold text-white">{Math.round(selectedManagerData.dailyAvgCalls)}</p>
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
                        {formatDuration(Math.round(selectedManagerData.dailyAvgCallLength))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lost Leads by Reason */}
                {selectedManagerData.lostLeadReasons.length > 0 && (
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <h3 className="mb-4 text-lg font-semibold text-white">Sotib olmaslik sabablari</h3>
                    <div className="space-y-2">
                      {selectedManagerData.lostLeadReasons
                        .sort((a, b) => b.count - a.count)
                        .map((item, idx) => (
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

            {/* Response Time Section */}
            {selectedManager && (
              <div className="rounded-lg bg-slate-800/50 p-4">
                <h3 className="mb-4 text-lg font-semibold text-white">Lid bildirishnomalariga javob vaqti</h3>
                <p className="mb-3 text-xs text-slate-400">
                  Yangi lid haqida xabar kelgandan keyin CRM tugmasini bosguncha o'rtacha vaqt
                </p>
                {responseStats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-200">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="px-3 py-2">Menejer</th>
                          <th className="px-3 py-2 text-center">Bildirishnomalar</th>
                          <th className="px-3 py-2 text-center">Javoblar</th>
                          <th className="px-3 py-2 text-center">O'rtacha javob vaqti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responseStats.map((stat) => (
                          <tr key={stat.manager} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="px-3 py-2 font-semibold">{stat.manager}</td>
                            <td className="px-3 py-2 text-center">{stat.totalNotifications}</td>
                            <td className="px-3 py-2 text-center">{stat.totalResponses}</td>
                            <td className="px-3 py-2 text-center">
                              {stat.avgResponseTimeMs > 0 ? (
                                <span className={`font-semibold ${
                                  stat.avgResponseTimeMs < 60000 ? 'text-green-400' :
                                  stat.avgResponseTimeMs < 300000 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {formatResponseTime(stat.avgResponseTimeMs)}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    Bu davr uchun bildirishnoma ma'lumotlari mavjud emas
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
