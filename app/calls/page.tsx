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
    totalDurationSec?: number;
  }>;
};

// Helper function to format seconds to HH:MM:SS
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

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

type UtelCallsData = {
  success: boolean;
  data?: {
    source: string;
    totalCalls: number;
    managerSummary: Array<{
      manager: string;
      totalCalls: number;
      incomingCount: number;
      outgoingCount: number;
      totalDurationSec: number;
      formattedDuration: string;
    }>;
  };
};

type SheetCallsData = {
  success: boolean;
  data?: {
    source: string;
    totalCalls: number;
    managerSummary: Array<{
      manager: string;
      incomingCount: number;
      outgoingCount: number;
      missedCount: number;
      totalCalls: number;
      totalDurationSec: number;
      formattedDuration: string;
    }>;
  };
};

type UiState = {
  period: PeriodKey;
  callsLoading: boolean;
  callsError: string | null;
  callsData: CallsData | null;
  onlinepbxLoading: boolean;
  onlinepbxError: string | null;
  onlinepbxData: OnlinePBXCallsData | null;
  utelLoading: boolean;
  utelError: string | null;
  utelData: UtelCallsData | null;
  sheetLoading: boolean;
  sheetError: string | null;
  sheetData: SheetCallsData | null;
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
    utelLoading: false,
    utelError: null,
    utelData: null,
    sheetLoading: false,
    sheetError: null,
    sheetData: null,
  });

  const callsAbortRef = useRef<AbortController | null>(null);
  const onlinepbxAbortRef = useRef<AbortController | null>(null);
  const utelAbortRef = useRef<AbortController | null>(null);
  const sheetAbortRef = useRef<AbortController | null>(null);

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

      const res = await fetch(`/api/onlinepbx/calls?period=${periodKey}`, {
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

  async function loadUtelCalls(periodKey: PeriodKey) {
    try {
      if (utelAbortRef.current) {
        utelAbortRef.current.abort();
      }
      utelAbortRef.current = new AbortController();

      setState((s) => ({ ...s, utelLoading: true, utelError: null, utelData: null }));

      const res = await fetch(`/api/utel/calls?period=${periodKey}`, {
        cache: "no-store",
        signal: utelAbortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || res.statusText || "Failed to load UTel data";
        throw new Error(msg);
      }

      const json = await res.json();
      const utelData: UtelCallsData = json;  // API returns full response with success and data fields

      setState((s) => {
        return {
          ...s,
          utelLoading: false,
          utelError: null,
          utelData,  // Store full response object
        };
      });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("UTel calls load error", err);
      setState((s) => {
        return {
          ...s,
          utelLoading: false,
          utelError: err?.message || "Failed to load UTel data",
          utelData: null,
        };
      });
    }
  }

  async function loadSheetCalls(periodKey: PeriodKey) {
    try {
      if (sheetAbortRef.current) {
        sheetAbortRef.current.abort();
      }
      sheetAbortRef.current = new AbortController();

      setState((s) => ({ ...s, sheetLoading: true, sheetError: null, sheetData: null }));

      // Replace with your actual Google Sheet ID
      const spreadsheetId = "10SpMBUxmNi4_ExGlJJwEycKDjg8VtyoH84CLcMgSbuY";

      const res = await fetch(`/api/sheets/calls?spreadsheetId=${spreadsheetId}&period=${periodKey}`, {
        cache: "no-store",
        signal: sheetAbortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || res.statusText || "Failed to load Google Sheet calls";
        throw new Error(msg);
      }

      const json = await res.json();
      const sheetData: SheetCallsData = json;

      setState((s) => {
        return {
          ...s,
          sheetLoading: false,
          sheetError: null,
          sheetData,
        };
      });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Sheet calls load error", err);
      setState((s) => {
        return {
          ...s,
          sheetLoading: false,
          sheetError: err?.message || "Failed to load Google Sheet calls",
          sheetData: null,
        };
      });
    }
  }

  async function load(periodKey: PeriodKey) {
    loadCalls(periodKey);
    loadOnlinePBXCalls(periodKey);
    loadUtelCalls(periodKey);
    loadSheetCalls(periodKey);
  }

  useEffect(() => {
    load(state.period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { period, callsLoading, callsError, callsData, onlinepbxLoading, onlinepbxError, onlinepbxData, utelLoading, utelError, utelData, sheetLoading, sheetError, sheetData } = state;

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
            amoCRM, OnlinePBX, UTel va Google Sheet qo&apos;ng&apos;iroqlari
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
        {/* Combined Call Information - OnlinePBX + Utel by Manager */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          {(onlinepbxLoading || utelLoading) ? (
            <div className="text-xs text-slate-400 animate-pulse">
              Qo&apos;ng&apos;iroqlar yuklanmoqda...
            </div>
          ) : (onlinepbxError || utelError) ? (
            <div className="text-xs text-red-400">
              Xato: {onlinepbxError || utelError}
            </div>
          ) : (() => {
            // Merge OnlinePBX and Utel data by manager
            const mergedManagers = new Map<string, {
              manager: string;
              totalCalls: number;
              incomingCalls: number;
              outgoingCalls: number;
              totalDurationSec: number;
              sources: string[];
            }>();

            // Add OnlinePBX data
            if (onlinepbxData && onlinepbxData.recentCalls.length > 0) {
              onlinepbxData.recentCalls.forEach((call) => {
                const managerName = call.user || "Unknown";
                const existing = mergedManagers.get(managerName) || {
                  manager: managerName,
                  totalCalls: 0,
                  incomingCalls: 0,
                  outgoingCalls: 0,
                  totalDurationSec: 0,
                  sources: [],
                };
                existing.totalCalls += 1;
                if (call.type === "in") {
                  existing.incomingCalls += 1;
                } else if (call.type === "out") {
                  existing.outgoingCalls += 1;
                }
                existing.totalDurationSec += call.duration;
                if (!existing.sources.includes("OnlinePBX")) {
                  existing.sources.push("OnlinePBX");
                }
                mergedManagers.set(managerName, existing);
              });
            }

            // Add Utel data
            if (utelData?.data && utelData.data.managerSummary.length > 0) {
              utelData.data.managerSummary.forEach((utelMgr) => {
                const existing = mergedManagers.get(utelMgr.manager) || {
                  manager: utelMgr.manager,
                  totalCalls: 0,
                  incomingCalls: 0,
                  outgoingCalls: 0,
                  totalDurationSec: 0,
                  sources: [],
                };
                existing.totalCalls += utelMgr.totalCalls;
                existing.incomingCalls += utelMgr.incomingCount;
                existing.outgoingCalls += utelMgr.outgoingCount;
                existing.totalDurationSec += utelMgr.totalDurationSec;
                if (!existing.sources.includes("UTel")) {
                  existing.sources.push("UTel");
                }
                mergedManagers.set(utelMgr.manager, existing);
              });
            }

            let mergedData = Array.from(mergedManagers.values())
              .sort((a, b) => b.totalCalls - a.totalCalls);

            // Filter out IVR system calls (5000, 5001, Unknown)
            mergedData = mergedData.filter(
              (m) => m.manager !== "5000" && m.manager !== "5001" && m.manager !== "Unknown"
            );

            if (mergedData.length === 0) {
              return (
                <div className="text-xs text-slate-500">
                  Tanlangan davr uchun qo&apos;ng&apos;iroqlar topilmadi.
                </div>
              );
            }

            // Calculate summary statistics after filtering
            const filteredTotalCalls = mergedData.reduce((sum, m) => sum + m.totalCalls, 0);
            const filteredTotalManagers = mergedData.length;
            const filteredAvgCalls = filteredTotalManagers > 0 ? filteredTotalCalls / filteredTotalManagers : 0;
            const filteredTotalIncoming = mergedData.reduce((sum, m) => sum + m.incomingCalls, 0);
            const filteredTotalOutgoing = mergedData.reduce((sum, m) => sum + m.outgoingCalls, 0);
            const filteredTotalDuration = mergedData.reduce((sum, m) => sum + m.totalDurationSec, 0);

            // Split into above and below average (using filtered average)
            const aboveAverage = mergedData.filter((m) => m.totalCalls > filteredAvgCalls);
            const belowAverage = mergedData.filter((m) => m.totalCalls <= filteredAvgCalls);

            return (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-slate-200 border-collapse">
                    {/* Table Header */}
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/50">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Xodim</th>
                        <th className="px-3 py-2">Barcha qo'ng'iroqlar</th>
                        <th className="px-3 py-2">Kuniga o'rtacha</th>
                        <th className="px-3 py-2">Kiruvchi</th>
                        <th className="px-3 py-2">Chiquvchi</th>
                        <th className="px-3 py-2">Subhbatlar umumiy vaqti</th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody>
                      {/* Summary Row */}
                      <tr className="border-b-2 border-slate-700 bg-slate-800">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 font-semibold">Barcha xodimlar ({filteredTotalManagers})</td>
                        <td className="px-3 py-2 font-semibold text-center">{filteredTotalCalls}</td>
                        <td className="px-3 py-2 text-center">{filteredAvgCalls.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{filteredTotalIncoming}</td>
                        <td className="px-3 py-2 text-center">{filteredTotalOutgoing}</td>
                        <td className="px-3 py-2 font-semibold text-center">{formatDuration(filteredTotalDuration)}</td>
                      </tr>

                      {/* Above Average Header */}
                      {aboveAverage.length > 0 && (
                        <tr className="border-t-2 border-slate-700 bg-slate-900/50">
                          <td colSpan={7} className="px-3 py-2 font-semibold text-slate-300">O&apos;rtachadan yuqori:</td>
                        </tr>
                      )}

                      {/* Above Average Rows */}
                      {aboveAverage.map((manager, idx) => (
                        <tr key={manager.manager} className="border-b border-slate-800 hover:bg-slate-800/30">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">{manager.manager}</td>
                          <td className="px-3 py-2 text-center">{manager.totalCalls}</td>
                          <td className="px-3 py-2 text-center">{manager.totalCalls.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center">{manager.incomingCalls}</td>
                          <td className="px-3 py-2 text-center">{manager.outgoingCalls}</td>
                          <td className="px-3 py-2 text-center">{formatDuration(manager.totalDurationSec)}</td>
                        </tr>
                      ))}

                      {/* Below Average Header */}
                      {belowAverage.length > 0 && (
                        <tr className="border-t-2 border-slate-700 bg-slate-900/50">
                          <td colSpan={7} className="px-3 py-2 font-semibold text-slate-300">O&apos;rtachadan past:</td>
                        </tr>
                      )}

                      {/* Below Average Rows */}
                      {belowAverage.map((manager, idx) => (
                        <tr key={manager.manager} className="border-b border-slate-800 hover:bg-slate-800/30">
                          <td className="px-3 py-2">{aboveAverage.length + idx + 1}</td>
                          <td className="px-3 py-2">{manager.manager}</td>
                          <td className="px-3 py-2 text-center">{manager.totalCalls}</td>
                          <td className="px-3 py-2 text-center">{manager.totalCalls.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center">{manager.incomingCalls}</td>
                          <td className="px-3 py-2 text-center">{manager.outgoingCalls}</td>
                          <td className="px-3 py-2 text-center">{formatDuration(manager.totalDurationSec)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </section>

      </div>

      {/* Footer Summary - Duration by Source */}
      <div className="fixed bottom-4 right-4 rounded-lg bg-slate-800/90 border border-slate-700 p-3 text-xs text-slate-300 space-y-1">
        <div className="font-semibold text-slate-100">Davomiyligi jami:</div>
        <div>
          OnlinePBX: <span className="text-blue-400 font-mono">{formatDuration(
            onlinepbxData?.recentCalls.reduce((sum, call) => sum + call.duration, 0) || 0
          )}</span>
        </div>
        <div>
          UTel: <span className="text-green-400 font-mono">{formatDuration(
            utelData?.data?.managerSummary.reduce((sum, mgr) => sum + mgr.totalDurationSec, 0) || 0
          )}</span>
        </div>
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
