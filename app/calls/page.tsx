"use client";

import { useEffect, useState, useRef } from "react";

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
  period: PeriodKey;
  callsLoading: boolean;
  callsError: string | null;
  callsData: CallsData | null;
  onlinepbxLoading: boolean;
  onlinepbxError: string | null;
  onlinepbxData: OnlinePBXCallsData | null;
};

export default function CallsPage() {
  const [state, setState] = useState<UiState>({
    period: "week",
    callsLoading: false,
    callsError: null,
    callsData: null,
    onlinepbxLoading: false,
    onlinepbxError: null,
    onlinepbxData: null,
  });

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
          callsError: err?.message || "Failed to load calls",
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

      const res = await fetch(`/api/dashboard/calls?period=${periodKey}&source=onlinepbx`, {
        cache: "no-store",
        signal: onlinepbxAbortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || res.statusText || "Failed to load OnlinePBX data";
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
    loadCalls(periodKey);
    loadOnlinePBXCalls(periodKey);
  }

  useEffect(() => {
    load(state.period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { period, callsLoading, callsError, callsData, onlinepbxLoading, onlinepbxError, onlinepbxData } = state;

  const handleChangePeriod = (p: PeriodKey) => {
    if (p === period) return;
    setState((s) => ({ ...s, period: p }));
    load(p);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Qo&apos;ng&apos;iroqlar – Tahlil</h1>
          <p className="text-sm text-slate-400">
            amoCRM va OnlinePBX qo&apos;ng&apos;iroqlari
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

      <div className="space-y-6">
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

        {/* OnlinePBX calls (Real-time from webhooks) - Manager summary */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">
            OnlinePBX Qo&apos;ng&apos;iroqlar bo&apos;yicha menejerlar
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
          ) : (() => {
            // Aggregate calls by manager
            const managerStats = onlinepbxData.recentCalls.reduce((acc, call) => {
              const existing = acc.find((m) => m.user === call.user);
              if (existing) {
                existing.totalCalls += 1;
                if (call.type === "out") {
                  existing.outboundCalls += 1;
                }
                existing.totalDuration += call.duration;
              } else {
                acc.push({
                  user: call.user,
                  totalCalls: 1,
                  outboundCalls: call.type === "out" ? 1 : 0,
                  totalDuration: call.duration,
                });
              }
              return acc;
            }, [] as Array<{ user: string; totalCalls: number; outboundCalls: number; totalDuration: number }>);

            return (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/60">
                      <th className="px-3 py-2">Menejer</th>
                      <th className="px-3 py-2">Jami qo&apos;ng&apos;iroqlar</th>
                      <th className="px-3 py-2">Chiquvchi qo&apos;ng&apos;iroqlar</th>
                      <th className="px-3 py-2">Davomiyligi (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerStats
                      .sort((a, b) => b.totalCalls - a.totalCalls)
                      .map((manager) => (
                        <tr
                          key={manager.user}
                          className="border-b border-slate-800 last:border-0"
                        >
                          <td className="px-3 py-2">{manager.user}</td>
                          <td className="px-3 py-2">
                            {manager.totalCalls.toLocaleString("ru-RU")}
                          </td>
                          <td className="px-3 py-2">
                            {manager.outboundCalls.toLocaleString("ru-RU")}
                          </td>
                          <td className="px-3 py-2 font-semibold">
                            {manager.totalDuration.toLocaleString("ru-RU")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </section>
      </div>
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
