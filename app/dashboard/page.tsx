// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DashboardData = {
  periodLabel: string;
  kelishuvSummasi: number;
  onlineSummasi: number;
  offlineSummasi: number;
  oylikTushum: number;
  haftalikTushum: number;
  leadsCount: number;
  qualifiedLeadsCount: number;
  nonQualifiedLeadsCount: number;
  conversionFromQualified: number;
  nonQualifiedReasons: { label: string; value: number }[];
  managerSales: {
    managerId: number;
    managerName: string;
    totalLeads: number;
    qualifiedLeads: number;
    wonDeals: number;
    wonAmount: number;
  }[];
  managerCalls: {
    managerName: string;
    callsAll: number;
    callsSuccess: number;
    callSecondsAll: number;
    callSecondsSuccess: number;
    avgCallSeconds: number;
  }[];
};

const COLORS = ["#0ea5e9", "#22c55e", "#eab308", "#ef4444", "#8b5cf6"];

type Period = "today" | "week" | "month" | "custom";

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("period", period);
      if (period === "custom" && fromDate && toDate) {
        params.set("from", fromDate);
        params.set("to", toDate);
      }

      const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Error");
      setData(json.data);
    } catch (e: any) {
      setError(e.message || "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleCustomApply = () => {
    if (!fromDate || !toDate) return;
    setPeriod("custom");
    load();
  };

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Najot Nur Sales Dashboard</h1>
          <p className="text-sm text-slate-600">
            Davr: {data?.periodLabel || "—"}
          </p>
        </div>
      </header>

      {/* Period selector */}
      <section className="flex flex-wrap items-center gap-3">
        <PeriodButton
          label="Bugun"
          active={period === "today"}
          onClick={() => setPeriod("today")}
        />
        <PeriodButton
          label="Bu hafta"
          active={period === "week"}
          onClick={() => setPeriod("week")}
        />
        <PeriodButton
          label="Bu oy"
          active={period === "month"}
          onClick={() => setPeriod("month")}
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          />
          <span className="text-xs text-slate-500">–</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          />
          <button
            onClick={handleCustomApply}
            className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
          >
            Tanlash
          </button>
        </div>
      </section>

      {loading && <p>Yuklanmoqda...</p>}
      {error && (
        <p className="text-sm text-red-600">
          Xatolik: {error}. AMO_TOKEN va config ni tekshiring.
        </p>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI cards */}
          <section className="grid gap-4 md:grid-cols-4">
            <KpiCard
              title="Kelishuv summasi"
              value={formatCurrency(data.kelishuvSummasi)}
            />
            <KpiCard
              title="Online kurslar (kelishuv)"
              value={formatCurrency(data.onlineSummasi)}
            />
            <KpiCard
              title="Offline kurslar (kelishuv)"
              value={formatCurrency(data.offlineSummasi)}
            />
            <KpiCard
              title="Konversiya (qualified → sotuv)"
              value={(data.conversionFromQualified * 100).toFixed(1) + "%"}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Lidlar soni"
              value={data.leadsCount.toString()}
            />
            <KpiCard
              title="Sifatli lidlar"
              value={data.qualifiedLeadsCount.toString()}
            />
            <KpiCard
              title="Sifatsiz lidlar"
              value={data.nonQualifiedLeadsCount.toString()}
            />
          </section>

          {/* Non-qualified reasons pie */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold">
                Sifatsiz lidlar sabablari
              </h2>
              {data.nonQualifiedReasons.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Hozircha maʼlumot yoʻq.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={data.nonQualifiedReasons}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.label}
                      >
                        {data.nonQualifiedReasons.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Income cards */}
            <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
              <h2 className="text-lg font-semibold">Tushum</h2>
              <KpiRow
                label="Oylik tushum (tanlangan davr)"
                value={formatCurrency(data.oylikTushum)}
              />
              <KpiRow
                label="Haftalik tushum (tanlangan davr)"
                value={formatCurrency(data.haftalikTushum)}
              />
            </div>
          </section>

          {/* Sales by manager */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">
              Sotuv – menejerlar bo‘yicha
            </h2>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Menejer</Th>
                    <Th>Lidlar</Th>
                    <Th>Sifatli lidlar</Th>
                    <Th>Sotuvlar (kelishuv)</Th>
                    <Th>Kelishuv summasi</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.managerSales.map((m) => (
                    <tr key={m.managerId} className="border-t">
                      <Td>{m.managerName}</Td>
                      <Td>{m.totalLeads}</Td>
                      <Td>{m.qualifiedLeads}</Td>
                      <Td>{m.wonDeals}</Td>
                      <Td>{formatCurrency(m.wonAmount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Calls by manager */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">
              Menejerlar – qo‘ng‘iroqlar statistika (Google Sheets)
            </h2>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Menejer</Th>
                    <Th>Qo‘ng‘iroqlar (jami)</Th>
                    <Th>Muvaffaqiyatli qo‘ng‘iroqlar</Th>
                    <Th>Soat (jami)</Th>
                    <Th>Soat (muvaffaqiyatli)</Th>
                    <Th>O‘rtacha davomiyligi (sek.)</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.managerCalls.map((m) => (
                    <tr key={m.managerName} className="border-t">
                      <Td>{m.managerName}</Td>
                      <Td>{m.callsAll}</Td>
                      <Td>{m.callsSuccess}</Td>
                      <Td>{secondsToHours(m.callSecondsAll)}</Td>
                      <Td>{secondsToHours(m.callSecondsSuccess)}</Td>
                      <Td>{m.avgCallSeconds}</Td>
                    </tr>
                  ))}
                  {data.managerCalls.length === 0 && (
                    <tr>
                      <Td colSpan={6}>
                        Google Sheets konfiguratsiyasini kiritmagansiz
                        yoki shu davrda qo‘ng‘iroqlar yo‘q.
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
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
      className={`rounded px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function KpiRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Th(props: any) {
  return (
    <th
      {...props}
      className={
        "px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
      }
    />
  );
}

function Td(props: any) {
  return (
    <td
      {...props}
      className={"px-4 py-2 text-sm text-slate-800 whitespace-nowrap"}
    />
  );
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function secondsToHours(sec: number) {
  if (!sec) return "0";
  const hours = sec / 3600;
  return hours.toFixed(2);
}
