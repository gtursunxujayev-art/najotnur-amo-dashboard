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


type UiState = {
  loading: boolean;
  error: string | null;
  data: DashboardData | null;
  period: PeriodKey;
};

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#ef4444", "#eab308"];

// Hook to detect window size
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

// Responsive pie chart label renderer
function createResponsiveLabel(isMobile: boolean) {
  return function renderLabel(props: { 
    name?: string; 
    percent?: number;
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    x?: number;
    y?: number;
  }) {
    if (isMobile) return null;
    
    const { name, percent, cx = 0, x = 0, y = 0 } = props;
    const p = typeof percent === "number" ? percent : 0;
    const displayName = name ?? "";
    
    const truncatedName = displayName.length > 12 
      ? displayName.substring(0, 10) + "..." 
      : displayName;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="#e2e8f0" 
        textAnchor={x > (cx || 0) ? "start" : "end"}
        dominantBaseline="central"
        fontSize="11"
      >
        {`${truncatedName} ${(p * 100).toFixed(0)}%`}
      </text>
    );
  };
}

export default function DashboardPage() {
  const [state, setState] = useState<UiState>({
    loading: true,
    error: null,
    data: null,
    period: "week",
  });

  const dashboardAbortRef = useRef<AbortController | null>(null);
  const windowSize = useWindowSize();


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
    
    fetch("/api/admin/init-scheduler", { method: "GET" })
      .then(r => r.json())
      .then(d => console.log("[Dashboard] Scheduler initialized:", d))
      .catch(e => console.error("[Dashboard] Scheduler init error:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, loading, error, period } = state;

  const handleChangePeriod = (p: PeriodKey) => {
    if (p === period) return;
    load(p);
  };

  const isMobile = windowSize.width > 0 && windowSize.width < 640;
  const isTablet = windowSize.width >= 640 && windowSize.width < 1024;
  const outerRadius = isMobile ? 70 : isTablet ? 65 : 80;

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
          Loading dashboard data...
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
              title="Sotuv shartnomasi"
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
              title="Konversiya (sifatli - sotuv)"
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
          <section className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {/* Lost reasons */}
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-200">
                Sifatsiz lid sabablari (Muvaffaqiyatsiz E&apos;tiroz sababi)
              </h2>
              <p className="mb-2 text-xs text-slate-400">
                Barcha yo&apos;qotilgan lidlar &quot;E&apos;tiroz sababi&quot; bo&apos;yicha.
              </p>
              {data.nonQualifiedReasons.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  Hali yo&apos;qotilgan lidlar yo&apos;q.
                </div>
              ) : (() => {
                const total = data.nonQualifiedReasons.reduce((sum, item) => sum + item.value, 0);
                const sortedData = [...data.nonQualifiedReasons].sort((a, b) => b.value - a.value);
                const filtered = sortedData.filter(item => (item.value / total) * 100 >= 5);
                
                return (
                  <div className={`${isMobile ? 'flex flex-col' : 'flex'} gap-4`}>
                    {/* Legend with color squares */}
                    <div className={`${isMobile ? 'order-2 w-full' : 'w-2/5'} flex flex-col justify-start overflow-y-auto ${isMobile ? 'max-h-40' : ''}`}>
                      <div className={`${isMobile ? 'grid grid-cols-2 gap-x-4 gap-y-1' : 'space-y-1'}`}>
                        {sortedData.map((reason, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-slate-300">
                            <div 
                              className="w-3 h-3 rounded-sm flex-shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className={`${isMobile ? 'truncate' : ''} flex-1`}>{reason.label}</span>
                            <span className="text-slate-400 font-semibold flex-shrink-0">{reason.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Pie chart */}
                    <div className={`${isMobile ? 'order-1 w-full h-56' : 'w-3/5 h-64'}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={isMobile ? { top: 5, right: 5, bottom: 5, left: 5 } : { top: 10, right: 30, bottom: 10, left: 30 }}>
                          <Pie
                            data={filtered}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={outerRadius}
                            labelLine={!isMobile}
                            label={createResponsiveLabel(isMobile)}
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
                            formatter={(value: number, name: string) => [`${value} (${((value / total) * 100).toFixed(0)}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Lead sources */}
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-200">
                Lid manbalari (Qayerdan)
              </h2>
              <p className="mb-2 text-xs text-slate-400">
                Lidlar soni &quot;Qayerdan&quot; maydoni bo&apos;yicha taqsimoti.
              </p>
              {data.leadSources.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  Lead manbalari topilmadi.
                </div>
              ) : (() => {
                const total = data.leadSources.reduce((sum, item) => sum + item.value, 0);
                const sortedData = [...data.leadSources].sort((a, b) => b.value - a.value);
                const filtered = sortedData.filter(item => (item.value / total) * 100 >= 5);
                
                return (
                  <div className={`${isMobile ? 'flex flex-col' : 'flex'} gap-4`}>
                    {/* Legend with color squares */}
                    <div className={`${isMobile ? 'order-2 w-full' : 'w-2/5'} flex flex-col justify-start overflow-y-auto ${isMobile ? 'max-h-40' : ''}`}>
                      <div className={`${isMobile ? 'grid grid-cols-2 gap-x-4 gap-y-1' : 'space-y-1'}`}>
                        {sortedData.map((source, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-slate-300">
                            <div 
                              className="w-3 h-3 rounded-sm flex-shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className={`${isMobile ? 'truncate' : ''} flex-1`}>{source.label}</span>
                            <span className="text-slate-400 font-semibold flex-shrink-0">{source.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Pie chart */}
                    <div className={`${isMobile ? 'order-1 w-full h-56' : 'w-3/5 h-64'}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={isMobile ? { top: 5, right: 5, bottom: 5, left: 5 } : { top: 10, right: 30, bottom: 10, left: 30 }}>
                          <Pie
                            data={filtered}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={outerRadius}
                            labelLine={!isMobile}
                            label={createResponsiveLabel(isMobile)}
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
                            formatter={(value: number, name: string) => [`${value} (${((value / total) * 100).toFixed(0)}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
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
                      <th className="px-3 py-2">Olingan lid</th>
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
