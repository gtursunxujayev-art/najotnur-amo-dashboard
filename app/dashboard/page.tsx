"use client";

import { useEffect, useState } from "react";
import { buildDashboardData, type DashboardData } from "@/lib/dashboard";
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

function getPeriodDates(period: PeriodKey): { from: Date; to: Date; label: string } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (period === "today") {
    return { from: todayStart, to: now, label: "Bugun" };
  }

  if (period === "week") {
    const from = new Date(todayStart);
    const day = from.getDay(); // 0–6, with 1 = Monday
    const diffToMonday = (day + 6) % 7;
    from.setDate(from.getDate() - diffToMonday);
    return { from, to: now, label: "Bu hafta" };
  }

  // month
  const from = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  return { from, to: now, label: "Bu oy" };
}

// Safe label for pie slices (avoids percent being undefined)
function pieLabelLossReason(props: { name?: string; percent?: number }) {
  const { name, percent } = props;
  const p = typeof percent === "number" ? percent : 0;
  return `${name ?? ""} ${(p * 100).toFixed(0)}%`;
}

// For lead sources chart
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
  });

  async function load(periodKey: PeriodKey) {
    try {
      setState((s) => ({ ...s, loading: true, error: null, period: periodKey }));
      const { from, to, label } = getPeriodDates(periodKey);

      const data = await buildDashboardData({ from, to }, label);

      setState((s) => ({
        ...s,
        loading: false,
        error: null,
        data,
      }));
    } catch (err: any) {
      console.error("Dashboard load error", err);
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.message || "Failed to load dashboard data",
        data: null,
      }));
    }
  }

  useEffect(() => {
    load(state.period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, loading, error, period } = state;

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
              title="Kelishuv summasi"
              value={`${data.kelishuvSummasi.toLocaleString("ru-RU")} so'm`}
              subtitle={data.periodLabel}
            />
            <MetricCard
              title="Sotuv – Online"
              value={`${data.onlineSummasi.toLocaleString("ru-RU")} so'm`}
              subtitle="Online kelishuvlar"
            />
            <MetricCard
              title="Sotuv – Offline"
              value={`${data.offlineSummasi.toLocaleString("ru-RU")} so'm`}
              subtitle="Offline kelishuvlar"
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
              title="Haftalik tushum"
              value={`${data.haftalikTushum.toLocaleString("ru-RU")} so'm`}
              subtitle="Hozircha = kelishuv summasi"
            />
          </section>

          {/* Charts row: Lost reasons + lead sources */}
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Sifatsiz lid sabablari */}
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-200">
                Sifatsiz lid sabablari (Muvaffaqiyatsiz E&apos;tiroz sababi)
              </h2>
              <p className="mb-2 text-xs text-slate-400">
                Barcha yo&apos;qotilgan lidlar “E&apos;tiroz sababi” bo&apos;yicha.
              </p>
              <div className="h-64">
                {data.nonQualifiedReasons.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    Hali yo&apos;qotilgan lidlar yo&apos;q.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.nonQualifiedReasons}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        labelLine={false}
                        label={pieLabelLossReason}
                      >
                        {data.nonQualifiedReasons.map((_, index) => (
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
                )}
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
              <div className="h-64">
                {data.leadSources.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    Lead manbalari topilmadi.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.leadSources}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        labelLine={false}
                        label={pieLabelSource}
                      >
                        {data.leadSources.map((_, index) => (
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
                )}
              </div>
            </div>
          </section>

          {/* Manager sales table */}
          <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Sotuv bo&apos;yicha menejerlar
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
                      <th className="px-3 py-2">Lidlar</th>
                      <th className="px-3 py-2">Sifatli lidlar</th>
                      <th className="px-3 py-2">Sotuvlar soni</th>
                      <th className="px-3 py-2">Sotuv summasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.managerSales.map((m) => (
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
                          {m.wonDeals.toLocaleString("ru-RU")}
                        </td>
                        <td className="px-3 py-2">
                          {m.wonAmount.toLocaleString("ru-RU")} so&apos;m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Manager calls table */}
          <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Qo&apos;ng&apos;iroqlar bo&apos;yicha menejerlar
            </h2>
            {data.managerCalls.length === 0 ? (
              <div className="text-xs text-slate-500">
                Qo&apos;ng&apos;iroqlar statistikasi topilmadi (amoCRM yoki Google
                Sheets).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/60">
                      <th className="px-3 py-2">Menejer</th>
                      <th className="px-3 py-2">Jami qo&apos;ng&apos;iroqlar</th>
                      <th className="px-3 py-2">Muvaffaqiyatli qo&apos;ng&apos;iroqlar</th>
                      <th className="px-3 py-2">Jami vaqt (daq.)</th>
                      <th className="px-3 py-2">O&apos;rtacha vaqt (sek.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.managerCalls.map((m) => (
                      <tr key={m.managerName} className="border-b border-slate-800 last:border-0">
                        <td className="px-3 py-2">{m.managerName}</td>
                        <td className="px-3 py-2">
                          {m.callsAll.toLocaleString("ru-RU")}
                        </td>
                        <td className="px-3 py-2">
                          {m.callsSuccess.toLocaleString("ru-RU")}
                        </td>
                        <td className="px-3 py-2">
                          {(m.callSecondsAll / 60).toFixed(1)}
                        </td>
                        <td className="px-3 py-2">
                          {m.avgCallSeconds.toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    ))}
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