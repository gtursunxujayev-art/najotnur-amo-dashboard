"use client";

import { useEffect, useState, useRef } from "react";
import type { DashboardData } from "@/lib/dashboard";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PeriodKey = "today" | "week" | "month";

type CallsData = {
  totalCalls: number;
  managerCalls: Array<{
    managerId: number;
    managerName: string;
    callsAll: number;
    callsOutbound: number;
  }>;
};

type OnlinePBXCallsData = {
  totalCalls: number;
  filteredCount: number;
  recentCalls: Array<{
    id: string;
    type: "in" | "out";
    date: string;
    duration: number;
    phone: string;
    user: string;
    source: string;
    timestamp: number;
  }>;
};

type UiState = {
  loading: boolean;
  error: string | null;
  data: DashboardData | null;
  period: PeriodKey;
  callsLoading: boolean;
  callsError: string | null;
  callsData: CallsData | null;
  onlinepbxLoading: boolean;
  onlinepbxError: string | null;
  onlinepbxData: OnlinePBXCallsData | null;
};

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#ef4444", "#eab308"];

// Safe label helpers for pie charts
function pieLabelLossReason(props: { name?: string; percent?: number }) {
  const { name, percent } = props;
  const p = typeof percent === "number" ? percent : 0;
  return `${name ?? ""} ${(p * 100).toFixed(0)}%`;
}

function pieLabelSource(props: { name?: string; percent?: number }) {
  const { name, percent } = props;
  const p = typeof percent === "number" ? percent : 0;
  return `${name ?? ""} ${(p * 100).toFixed(0)}%`;
}

export default function DashboardPage() {
  const [state, setState] = useState<UiState>({
    loading: true,
    error: null,
    data: null,
    period: "week",
    callsLoading: false,
    callsError: null,
    callsData: null,
    onlinepbxLoading: false,
    onlinepbxError: null,
    onlinepbxData: null,
  });

  const dashboardAbortRef = useRef<AbortController | null>(null);
  const callsAbortRef = useRef<AbortController | null>(null);
  const onlinepbxAbortRef = useRef<AbortController | null>(null);

  async function loadCalls(periodKey: PeriodKey) {
    try {
      if (callsAbortRef.current) {
        callsAbortRef.current.abort();
      }
      callsAbortRef.current = new AbortController();

      setState((s) => ({ ...s, callsLoading: true, callsError: null, callsData: null }));

      const res = await fetch(`/api/dashboard/calls?period=${periodKey}`, {
        cache: "no-store",
        signal: callsAbortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || res.statusText || "Failed to load calls";
        throw new Error(msg);
      }

      const json = await res.json();
      const callsData: CallsData = json.data;

      setState((s) => {
        if (s.period !== periodKey) return s;
        return {
          ...s,
          callsLoading: false,
          callsError: null,
          callsData,
        };
      });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Calls load error", err);
      setState((s) => {
        if (s.period !== periodKey) return s;
        return {
          ...s,
          callsLoading: false,
          callsError: err?.message || "Failed to load calls data",
          callsData: null,
        };
      });
    }
  }

  async function loadOnlinePBXCalls(periodKey: PeriodKey) {
    try {
      if (onlinepbxAbortRef.current) {
        onlinepbxAbortRef.current.abort();
      }
      onlinepbxAbortRef.current = new AbortController();

      setState((s) => ({ ...s, onlinepbxLoading: true, onlinepbxError: null, onlinepbxData: null }));

      // Calculate date range based on period
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let fromDate = new Date(today);
      let toDate = new Date(today);
      toDate.setHours(23, 59, 59, 999);

      if (periodKey === "week") {
        const dayOfWeek = today.getDay();
        fromDate.setDate(today.getDate() - dayOfWeek); // Set to Monday
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
      } else if (periodKey === "month") {
        fromDate.setDate(1); // Set to 1st of month
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
      }

      const fromParam = fromDate.toISOString().split("T")[0];
      const toParam = toDate.toISOString().split("T")[0];

      const res = await fetch(`/api/onlinepbx/webhook?limit=1000&from=${fromParam}&to=${toParam}`, {
        cache: "no-store",
        signal: onlinepbxAbortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || res.statusText || "Failed to load OnlinePBX calls";
        throw new Error(msg);
      }

      const json = await res.json();
      const onlinepbxData: OnlinePBXCallsData = json.data;

      setState((s) => {
        return {
          ...s,
          onlinepbxLoading: false,
          onlinepbxError: null,
          onlinepbxData,
        };
      });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("OnlinePBX calls load error", err);
      setState((s) => {
        return {
          ...s,
          onlinepbxLoading: false,
          onlinepbxError: err?.message || "Failed to load OnlinePBX data",
          onlinepbxData: null,
        };
      });
    }
  }

  async function load(periodKey: PeriodKey) {
    try {
      if (dashboardAbortRef.current) {
        dashboardAbortRef.current.abort();
      }
      dashboardAbortRef.current = new AbortController();

      setState((s) => ({ ...s, loading: true, error: null, period: periodKey }));

      const res = await fetch(`/api/dashboard?period=${periodKey}`, {
        cache: "no-store",
        signal: dashboardAbortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || res.statusText || "Failed to load data";
        throw new Error(msg);
      }

      const json = await res.json();
      const data: DashboardData = json.data;

      setState((s) => {
        if (s.period !== periodKey) return s;
        return {
          ...s,
          loading: false,
          error: null,
          data,
        };
      });

      loadCalls(periodKey);
      loadOnlinePBXCalls(periodKey);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Dashboard load error", err);
      setState((s) => {
        if (s.period !== periodKey) return s;
        return {
          ...s,
          loading: false,
          error: err?.message || "Failed to load dashboard data",
          data: null,
        };
      });
    }
  }

  useEffect(() => {
    load(state.period);
    
    // Initialize scheduler on app startup
    fetch("/api/admin/init-scheduler", { method: "GET" })
      .then(r => r.json())
      .then(d => console.log("[Dashboard] Scheduler initialized:", d))
      .catch(e => console.error("[Dashboard] Scheduler init error:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, loading, error, period, callsLoading, callsError, callsData, onlinepbxLoading, onlinepbxError, onlinepbxData } = state;

  const handleChangePeriod = (p: PeriodKey) => {
    if (p === period) return;
    load(p);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Najot Nur – Dashboard</h1>
          <p className="text-sm text-slate-400">
            amoCRM + optional Google Sheets statistikasi
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-800 p-1 text-xs font-semibold">
          <PeriodButton
            label="Bugun"
            active={period === "today"}
            onClick={() => handleChangePeriod("today")}
          />
          <PeriodButton
            label="Bu hafta"
            active={period === "week"}
            onClick={() => handleChangePeriod("week")}
          />
          <PeriodButton
            label="Bu oy"
            active={period === "month"}
            onClick={() => handleChangePeriod("month")}
          />
        </div>
      </header>

      {loading && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
          Loading dashboard data…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-600 bg-red-950 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Top metrics */}
          <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <MetricCard
              title="Sotuv"
              value={(data.onlineSalesCount + data.offlineSalesCount).toLocaleString("ru-RU")}
              subtitle={`${data.kelishuvSummasi.toLocaleString("ru-RU")} so'm`}
            />
            <MetricCard
              title="Sotuv – Online"
              value={data.onlineSalesCount.toLocaleString("ru-RU")}
              subtitle={`${data.onlineRevenue.toLocaleString("ru-RU")} so'm`}
            />
            <MetricCard
              title="Sotuv – Offline"
              value={data.offlineSalesCount.toLocaleString("ru-RU")}
              subtitle={`${data.offlineRevenue.toLocaleString("ru-RU")} so'm`}
            />
            <MetricCard
              title="Lidlar (jami)"
              value={data.leadsCount.toLocaleString("ru-RU")}
              subtitle="Tanlangan davr"
            />
            <MetricCard
              title="Sifatli lidlar"
              value={data.qualifiedLeadsCount.toLocaleString("ru-RU")}
              subtitle="Qualified"
            />
            <MetricCard
              title="Sifatsiz lidlar"
              value={data.nonQualifiedLeadsCount.toLocaleString("ru-RU")}
              subtitle="NOT qualified reasons"
            />
            <MetricCard
              title="Konversiya (sifatli → sotuv)"
              value={`${(data.conversionFromQualified * 100).toFixed(1)}%`}
              subtitle="Won from qualified"
            />
            <MetricCard
              title="Tushum"
              value={`${data.haftalikTushum.toLocaleString("ru-RU")} so'm`}
              subtitle="Hozircha = kelishuv summasi"
            />
          </section>

          {/* Charts: lost reasons + lead sources */}
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Lost reasons */}
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-200">
                Sifatsiz lid sabablari (Muvaffaqiyatsiz E&apos;tiroz sababi)
              </h2>
              <p className="mb-2 text-xs text-slate-400">
                Barcha yo&apos;qotilgan lidlar “E&apos;tiroz sababi” bo&apos;yicha.
              </p>
              <div className="flex h-64 gap-4">
                {/* Left side: List - sorted by value descending */}
                <div className="w-2/5 flex flex-col justify-start overflow-y-auto pr-2">
                  {data.nonQualifiedReasons.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      Hali yo&apos;qotilgan lidlar yo&apos;q.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {[...data.nonQualifiedReasons]
                        .sort((a, b) => b.value - a.value)
                        .map((reason, index) => (
                          <div key={index} className="flex justify-between text-xs text-slate-300 whitespace-nowrap">
                            <span className="flex-shrink-0">{reason.label}</span>
                            <span className="ml-2 text-slate-400 font-semibold flex-shrink-0">{reason.value}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                
                {/* Right side: Pie chart with labels */}
                <div className="w-3/5">
                  {data.nonQualifiedReasons.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      Hali yo&apos;qotilgan lidlar yo&apos;q.
                    </div>
                  ) : (() => {
                    const total = data.nonQualifiedReasons.reduce((sum, item) => sum + item.value, 0);
                    const filtered = [...data.nonQualifiedReasons]
                      .sort((a, b) => b.value - a.value)
                      .filter(item => (item.value / total) * 100 >= 5);
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                          <Pie
                            data={filtered}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={55}
                            labelLine={true}
                            label={pieLabelLossReason}
                          >
                            {filtered.map((_, index) => (
                              <Cell
                                key={index}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              border: "1px solid #1e293b",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Lead sources */}
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-200">
                Lid manbalari (Qayerdan)
              </h2>
              <p className="mb-2 text-xs text-slate-400">
                Lidlar soni {`"Qayerdan"`} maydoni bo&apos;yicha taqsimoti.
              </p>
              <div className="flex h-64 gap-4">
                {/* Left side: List - sorted by value descending */}
                <div className="w-2/5 flex flex-col justify-start overflow-y-auto pr-2">
                  {data.leadSources.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      Lead manbalari topilmadi.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {[...data.leadSources]
                        .sort((a, b) => b.value - a.value)
                        .map((source, index) => (
                          <div key={index} className="flex justify-between text-xs text-slate-300 whitespace-nowrap">
                            <span className="flex-shrink-0">{source.label}</span>
                            <span className="ml-2 text-slate-400 font-semibold flex-shrink-0">{source.value}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                
                {/* Right side: Pie chart with labels */}
                <div className="w-3/5">
                  {data.leadSources.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      Lead manbalari topilmadi.
                    </div>
                  ) : (() => {
                    const total = data.leadSources.reduce((sum, item) => sum + item.value, 0);
                    const filtered = [...data.leadSources]
                      .sort((a, b) => b.value - a.value)
                      .filter(item => (item.value / total) * 100 >= 5);
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                          <Pie
                            data={filtered}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={55}
                            labelLine={true}
                            label={pieLabelSource}
                          >
                            {filtered.map((_, index) => (
                              <Cell
                                key={index}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              border: "1px solid #1e293b",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>
            </div>
          </section>

          {/* Manager sales */}
          <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Sotuv menejerlar bo&apos;yicha
            </h2>
            {data.managerSales.length === 0 ? (
              <div className="text-xs text-slate-500">
                Tanlangan davrda sotuvlar topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/60">
                      <th className="px-3 py-2">Menejer</th>
                      <th className="px-3 py-2">Lid</th>
                      <th className="px-3 py-2">Sifatli Lid</th>
                      <th className="px-3 py-2">Sotuv</th>
                      <th className="px-3 py-2">Konversiya</th>
                      <th className="px-3 py-2">Online</th>
                      <th className="px-3 py-2">Ofline</th>
                      <th className="px-3 py-2">Tushum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.managerSales
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((m) => {
                        const totalSales = m.onlineSalesCount + m.offlineSalesCount;
                        const conversion = m.qualifiedLeads > 0 
                          ? ((totalSales / m.qualifiedLeads) * 100).toFixed(1) 
                          : "0";
                        return (
                          <tr
                            key={m.managerId}
                            className="border-b border-slate-800 last:border-0"
                          >
                            <td className="px-3 py-2">{m.managerName}</td>
                            <td className="px-3 py-2">
                              {m.totalLeads.toLocaleString("ru-RU")}
                            </td>
                            <td className="px-3 py-2">
                              {m.qualifiedLeads.toLocaleString("ru-RU")}
                            </td>
                            <td className="px-3 py-2">
                              {totalSales.toLocaleString("ru-RU")}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {conversion}%
                            </td>
                            <td className="px-3 py-2">
                              {m.onlineSalesCount.toLocaleString("ru-RU")}
                            </td>
                            <td className="px-3 py-2">
                              {m.offlineSalesCount.toLocaleString("ru-RU")}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {m.revenue.toLocaleString("ru-RU")} so&apos;m
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Manager calls (amoCRM) */}
          <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Qo&apos;ng&apos;iroqlar bo&apos;yicha menejerlar (amoCRM)
            </h2>
            {callsLoading ? (
              <div className="text-xs text-slate-400 animate-pulse">
                Qo&apos;ng&apos;iroqlar yuklanmoqda...
              </div>
            ) : callsError ? (
              <div className="text-xs text-red-400">
                Xato: {callsError}
              </div>
            ) : !callsData || callsData.managerCalls.length === 0 ? (
              <div className="text-xs text-slate-500">
                Qo&apos;ng&apos;iroqlar statistikasi topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/60">
                      <th className="px-3 py-2">Menejer</th>
                      <th className="px-3 py-2">Jami qo&apos;ng&apos;iroqlar</th>
                      <th className="px-3 py-2">Chiquvchi qo&apos;ng&apos;iroqlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callsData.managerCalls.map((m) => (
                      <tr
                        key={m.managerId}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="px-3 py-2">{m.managerName}</td>
                        <td className="px-3 py-2">
                          {m.callsAll.toLocaleString("ru-RU")}
                        </td>
                        <td className="px-3 py-2">
                          {m.callsOutbound.toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* OnlinePBX calls (Real-time from webhooks) */}
          <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              OnlinePBX Qo&apos;ng&apos;iroqlar (Real-time)
            </h2>
            {onlinepbxLoading ? (
              <div className="text-xs text-slate-400 animate-pulse">
                OnlinePBX qo&apos;ng&apos;iroqlari yuklanmoqda...
              </div>
            ) : onlinepbxError ? (
              <div className="text-xs text-red-400">
                Xato: {onlinepbxError}
              </div>
            ) : !onlinepbxData || onlinepbxData.recentCalls.length === 0 ? (
              <div className="text-xs text-slate-500">
                Tanlangan davr uchun OnlinePBX qo&apos;ng&apos;iroqlari topilmadi.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 mb-3">
                  Jami: <span className="font-semibold text-slate-200">{onlinepbxData.totalCalls}</span> ta qo&apos;ng&apos;iroq (Tanlangan davr: <span className="font-semibold">{onlinepbxData.filteredCount}</span>)
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="min-w-full text-left text-xs text-slate-200">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-700 bg-slate-800/60">
                        <th className="px-3 py-2">Vaqt</th>
                        <th className="px-3 py-2">Turi</th>
                        <th className="px-3 py-2">Telefon</th>
                        <th className="px-3 py-2">Foydalanuvchi</th>
                        <th className="px-3 py-2">Vaqt (s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onlinepbxData.recentCalls.map((call) => {
                        const callDate = new Date(call.date);
                        const timeStr = callDate.toLocaleString("uz-UZ", { 
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit", 
                          minute: "2-digit", 
                          second: "2-digit" 
                        });
                        const isIncoming = call.type === "in";
                        return (
                          <tr
                            key={call.id}
                            className="border-b border-slate-800 last:border-0"
                          >
                            <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{timeStr}</td>
                            <td className="px-3 py-2">
                              <span className={`${isIncoming ? "text-green-400" : "text-blue-400"}`}>
                                {isIncoming ? "📥 IN" : "📤 OUT"}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-300">{call.phone}</td>
                            <td className="px-3 py-2">{call.user}</td>
                            <td className="px-3 py-2 text-slate-400">{call.duration}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function PeriodButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 transition-colors ${
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-200 hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
      <div className="text-xs font-medium text-slate-400">{title}</div>
      <div className="mt-1 text-lg font-bold text-slate-50">{value}</div>
      {subtitle && (
        <div className="mt-1 text-[11px] text-slate-500">{subtitle}</div>
      )}
    </div>
  );
}