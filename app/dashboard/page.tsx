"use client";

import { useEffect, useMemo, useState } from "react";

// If you already import types from somewhere, keep it.
// Otherwise this is safe:
type DashboardData = any;

type FetchDebug = {
  url: string;
  status?: number;
  statusText?: string;
  rawText?: string;
  jsonError?: string;
  networkError?: string;
};

async function safeFetchJson(url: string): Promise<{ data?: any; debug: FetchDebug }> {
  const debug: FetchDebug = { url };

  try {
    const res = await fetch(url, { cache: "no-store" });
    debug.status = res.status;
    debug.statusText = res.statusText;

    const rawText = await res.text();
    debug.rawText = rawText?.slice(0, 2000) || ""; // preview limit

    if (!rawText) {
      debug.jsonError = "Response body is empty";
      return { debug };
    }

    try {
      const json = JSON.parse(rawText);
      return { data: json, debug };
    } catch (e: any) {
      debug.jsonError = e?.message || "JSON parse error";
      return { debug };
    }
  } catch (e: any) {
    debug.networkError = e?.message || "Network error";
    return { debug };
  }
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<string>("today");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string>("");
  const [debug, setDebug] = useState<FetchDebug | null>(null);

  const debugMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("debug") === "1";
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setDebug(null);

      const url = `/api/dashboard?period=${encodeURIComponent(period)}`;
      const { data: json, debug } = await safeFetchJson(url);

      if (!alive) return;

      // Backend should return { success: true, data }
      if (!json) {
        setError("Dashboard API JSON qaytarmadi.");
        setDebug(debug);
        setLoading(false);
        return;
      }

      if (json.success === false) {
        setError(json.error || "Dashboard API error");
        setDebug(debug);
        setLoading(false);
        return;
      }

      // If backend returns {data}
      const payload = json.data ?? json;

      setData(payload);
      setLoading(false);

      // Save debug only if debugMode enabled
      if (debugMode) setDebug(debug);
    }

    load();

    return () => {
      alive = false;
    };
  }, [period, debugMode]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Najot Nur – Dashboard</h1>
          <p className="text-sm text-slate-400">
            amoCRM + optional Google Sheets statistikasi
          </p>
        </header>

        {/* PERIOD PICKER — keep your existing UI if you had one */}
        <section className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "today", label: "Bugun" },
            { key: "yesterday", label: "Kecha" },
            { key: "thisWeek", label: "Shu hafta" },
            { key: "lastWeek", label: "O‘tgan hafta" },
            { key: "thisMonth", label: "Shu oy" },
            { key: "lastMonth", label: "O‘tgan oy" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1 text-sm transition ${
                period === p.key
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </section>

        {/* ERROR BOX */}
        {error && (
          <section className="mb-4 rounded-md border border-red-500/40 bg-red-950/40 p-3">
            <div className="text-sm font-semibold text-red-200">
              {error}
            </div>

            {/* DEBUG DROPDOWN (shows only on error or debug=1) */}
            {(debug || debugMode) && (
              <details className="mt-2 cursor-pointer select-text text-xs text-red-100/90">
                <summary className="mb-2 font-medium">
                  Debug maʼlumotlarini ko‘rsatish
                </summary>

                <div className="space-y-2 rounded bg-black/40 p-2">
                  <div><b>URL:</b> {debug?.url}</div>
                  <div>
                    <b>Status:</b> {debug?.status} {debug?.statusText}
                  </div>

                  {debug?.networkError && (
                    <div><b>Network error:</b> {debug.networkError}</div>
                  )}
                  {debug?.jsonError && (
                    <div><b>JSON error:</b> {debug.jsonError}</div>
                  )}

                  <div>
                    <b>Raw response preview:</b>
                    <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-black/60 p-2 text-[11px] leading-4">
                      {debug?.rawText || "(empty)"}
                    </pre>
                  </div>
                </div>
              </details>
            )}
          </section>
        )}

        {/* LOADING */}
        {loading && (
          <div className="rounded-md bg-slate-900/50 p-4 text-sm text-slate-300">
            Yuklanmoqda...
          </div>
        )}

        {/* MAIN DASHBOARD UI — keep your existing render below */}
        {!loading && data && (
          <div className="space-y-6">
            {/* Keep your cards/charts exactly as before.
                Here is just a safe example of rendering: */}
            <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">Kelishuv summasi</div>
                <div className="text-xl font-semibold">
                  {(data.kelishuvSummasi ?? 0).toLocaleString("ru-RU")} so'm
                </div>
                <div className="text-xs text-slate-500">
                  {data.periodLabel}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">Sotuv – Online</div>
                <div className="text-xl font-semibold">
                  {(data.onlineSummasi ?? 0).toLocaleString("ru-RU")} so'm
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">Sotuv – Offline</div>
                <div className="text-xl font-semibold">
                  {(data.offlineSummasi ?? 0).toLocaleString("ru-RU")} so'm
                </div>
              </div>
            </section>

            {/* Put the rest of your existing UI here unchanged */}
          </div>
        )}
      </div>
    </main>
  );
}