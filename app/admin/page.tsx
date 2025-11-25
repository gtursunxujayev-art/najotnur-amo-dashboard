"use client";

import { useEffect, useMemo, useState } from "react";

type MetaPipeline = { id: number; name: string };
type MetaStatus = {
  id: number;
  name: string;
  pipeline_id?: number | null;
  pipelineId?: number | null;
  pipeline?: { id?: number | null } | null;
};
type MetaLossReason = { id: number; name: string };
type MetaCustomField = {
  id: number;
  name: string;
  type: string;
  enums?: { id: number; value: string }[];
};
type MetaResponse = {
  pipelines: MetaPipeline[];
  statuses: MetaStatus[];
  lossReasons: MetaLossReason[];
  customFields: MetaCustomField[];
};

type ConstructorState = {
  PIPELINE_IDS: number[]; // config side still expects array
  QUALIFIED_STATUS_IDS: number[];
  WON_STATUS_IDS: number[];
  LOST_STATUS_IDS: number[];
  QUALIFIED_LOSS_REASON_IDS: number[];
  NOT_QUALIFIED_REASON_IDS: number[];

  LEAD_SOURCE_FIELD_ID: number | null;
  COURSE_TYPE_FIELD_ID: number | null;

  ONLINE_COURSE_ENUM_IDS: number[];
  OFFLINE_COURSE_ENUM_IDS: number[];

  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export default function AdminPage() {
  const [tab, setTab] = useState<"info" | "constructor" | "tushum" | "csv-import" | "amocrm-calls">("info");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<any>(null);

  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [amoCalls, setAmoCalls] = useState<any>(null);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [callsDays, setCallsDays] = useState(7);

  const [constructorData, setConstructorData] = useState<ConstructorState>({
    PIPELINE_IDS: [],
    QUALIFIED_STATUS_IDS: [],
    WON_STATUS_IDS: [],
    LOST_STATUS_IDS: [],
    QUALIFIED_LOSS_REASON_IDS: [],
    NOT_QUALIFIED_REASON_IDS: [],

    LEAD_SOURCE_FIELD_ID: null,
    COURSE_TYPE_FIELD_ID: null,

    ONLINE_COURSE_ENUM_IDS: [],
    OFFLINE_COURSE_ENUM_IDS: [],

    USE_AMO_CALLS: false,
    USE_SHEETS_CALLS: false,
  });

  const [selectedPipelineId, setSelectedPipelineId] = useState<number | "">("");

  const [tushum, setTushum] = useState({
    link: "",
    managerColumn: "",
    dateColumn: "",
    paymentTypeColumn: "",
    incomeTypeColumn: "",
    amountColumn: "",
    courseTypeColumn: "",
  });

  async function loadMeta() {
    try {
      setLoadingMeta(true);
      setErr(null);
      const res = await fetch("/api/meta");
      const data = await res.json();
      setMeta({
        pipelines: data.pipelines || [],
        statuses: data.statuses || [],
        lossReasons: data.lossReasons || [],
        customFields: data.customFields || [],
      });
    } catch (e: any) {
      setErr("Meta yuklashda xatolik: " + e.message);
    } finally {
      setLoadingMeta(false);
    }
  }

  useEffect(() => {
    if (tab !== "constructor") return;
    loadMeta();
  }, [tab]);

  const toggleId = (arr: number[], id: number) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  function getStatusPipelineId(st: MetaStatus): number | null {
    return (
      (typeof st.pipeline_id === "number" ? st.pipeline_id : null) ??
      (typeof st.pipelineId === "number" ? st.pipelineId : null) ??
      (typeof st.pipeline?.id === "number" ? st.pipeline!.id! : null)
    );
  }

  const filteredStatuses = useMemo(() => {
    if (!meta) return [];

    const allStatuses = meta.statuses || [];
    const selectedPipes = constructorData.PIPELINE_IDS;

    if (!selectedPipes.length) return allStatuses;

    const hasAnyPipelineId = allStatuses.some((s) => getStatusPipelineId(s) != null);
    if (!hasAnyPipelineId) return allStatuses;

    return allStatuses.filter((s) => {
      const pid = getStatusPipelineId(s);
      return pid != null && selectedPipes.includes(pid);
    });
  }, [meta, constructorData.PIPELINE_IDS]);

  const selectedCourseField = useMemo(() => {
    if (!meta || !constructorData.COURSE_TYPE_FIELD_ID) return null;
    return meta.customFields.find((f) => f.id === constructorData.COURSE_TYPE_FIELD_ID) || null;
  }, [meta, constructorData.COURSE_TYPE_FIELD_ID]);

  // dropdown change handler
  function onPipelineChange(val: string) {
    const id = val ? Number(val) : "";
    setSelectedPipelineId(id);

    setConstructorData((s) => ({
      ...s,
      PIPELINE_IDS: id === "" ? [] : [id], // keep array in config
      QUALIFIED_STATUS_IDS: [],
      WON_STATUS_IDS: [],
      LOST_STATUS_IDS: [],
    }));
  }

  async function saveConstructor() {
    try {
      setSaving(true);
      setMsg(null);
      setErr(null);
      const res = await fetch("/api/admin/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "constructor", data: constructorData }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Save failed");
      setMsg("✅ Constructor konfiguratsiyasi GitHub’ga saqlandi (redeploy bo‘ladi)!");
    } catch (e: any) {
      setErr("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveTushum() {
    try {
      setSaving(true);
      setMsg(null);
      setErr(null);
      const res = await fetch("/api/admin/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tushum", data: tushum }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Save failed");
      setMsg("✅ Tushum konfiguratsiyasi GitHub’ga saqlandi (redeploy bo‘ladi)!");
    } catch (e: any) {
      setErr("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
      <h1 className="mb-6 text-3xl font-bold">Admin panel</h1>

      <div className="mb-6 flex gap-3 flex-wrap">
        <button
          onClick={() => setTab("info")}
          className={`rounded px-3 py-1 ${tab === "info" ? "bg-emerald-600" : "bg-slate-800"}`}
        >
          Info
        </button>
        <button
          onClick={() => setTab("constructor")}
          className={`rounded px-3 py-1 ${tab === "constructor" ? "bg-emerald-600" : "bg-slate-800"}`}
        >
          Constructor
        </button>
        <button
          onClick={() => setTab("tushum")}
          className={`rounded px-3 py-1 ${tab === "tushum" ? "bg-emerald-600" : "bg-slate-800"}`}
        >
          Tushum
        </button>
        <button
          onClick={() => setTab("amocrm-calls")}
          className={`rounded px-3 py-1 ${tab === "amocrm-calls" ? "bg-emerald-600" : "bg-slate-800"}`}
        >
          📞 amoCRM Calls
        </button>
        <button
          onClick={() => setTab("csv-import")}
          className={`rounded px-3 py-1 ${tab === "csv-import" ? "bg-emerald-600" : "bg-slate-800"}`}
        >
          📥 CSV Import
        </button>
      </div>

      {msg && (
        <div className="mb-3 rounded bg-emerald-900/40 px-3 py-2 text-sm text-emerald-200">
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-3 rounded bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      {tab === "amocrm-calls" && (
        <div className="rounded-xl bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold mb-4">📞 amoCRM Call Data</h2>
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <label className="text-sm text-slate-300">Last</label>
              <select value={callsDays} onChange={(e) => setCallsDays(parseInt(e.target.value))} className="bg-slate-800 text-slate-100 rounded px-2 py-1 text-sm">
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
              <button onClick={async () => { setLoadingCalls(true); try { const r = await fetch(`/api/amocrm/calls?days=${callsDays}&limit=100`); const d = await r.json(); setAmoCalls(d); } finally { setLoadingCalls(false); } }} disabled={loadingCalls} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 px-3 py-1 rounded text-sm font-semibold"> {loadingCalls ? "Loading..." : "Fetch"} </button>
            </div>

            {amoCalls && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-800 p-3 rounded">
                    <p className="text-xs text-slate-400">Total Calls</p>
                    <p className="text-2xl font-bold text-emerald-400">{amoCalls.stats?.totalCalls || 0}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded">
                    <p className="text-xs text-slate-400">Avg Duration</p>
                    <p className="text-2xl font-bold text-blue-400">{amoCalls.stats?.averageDuration || 0}s</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded">
                    <p className="text-xs text-slate-400">Total Duration</p>
                    <p className="text-2xl font-bold text-purple-400">{(amoCalls.stats?.totalDuration / 3600).toFixed(1)}h</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded">
                    <p className="text-xs text-slate-400">Managers</p>
                    <p className="text-2xl font-bold text-pink-400">{Object.keys(amoCalls.stats?.callsByManager || {}).length}</p>
                  </div>
                </div>

                <div className="bg-slate-800 p-4 rounded">
                  <p className="text-sm font-semibold mb-3 text-slate-200">By Manager:</p>
                  <div className="space-y-2">
                    {Object.entries(amoCalls.stats?.callsByManager || {}).map(([manager, stats]: [string, any]) => (
                      <div key={manager} className="flex justify-between items-center text-sm bg-slate-700/50 p-2 rounded">
                        <span>{manager}</span>
                        <span className="text-slate-300">{stats.count} calls, {Math.round(stats.totalSeconds / 60)}m, avg {stats.avgSeconds}s</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-xs text-slate-300">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr>
                        <th className="text-left px-2 py-1">#</th>
                        <th className="text-left px-2 py-1">Manager</th>
                        <th className="text-left px-2 py-1">Date/Time</th>
                        <th className="text-left px-2 py-1">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amoCalls.calls?.slice(0, 50).map((call: any, idx: number) => (
                        <tr key={idx} className="border-t border-slate-700">
                          <td className="px-2 py-1">{call.index}</td>
                          <td className="px-2 py-1">{call.managerName}</td>
                          <td className="px-2 py-1">{new Date(call.dateTime).toLocaleString()}</td>
                          <td className="px-2 py-1">{call.durationMinutes}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "csv-import" && (
        <div className="rounded-xl bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold mb-4">📥 Call Data Import (CSV or XLSX)</h2>
          <div className="space-y-4">
            <input type="file" accept=".csv,.xlsx" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvResult(null); }} id="csv-file-input" className="block w-full p-2 bg-slate-800 text-slate-100 rounded" />
            {csvFile && <p className="text-sm text-slate-300">File: {csvFile.name} ({(csvFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
            <button onClick={async () => { if (!csvFile) return; setCsvUploading(true); try { const buffer = await csvFile.arrayBuffer(); const isXlsx = csvFile.name.toLowerCase().endsWith(".xlsx"); const r = await fetch("/api/onlinepbx/import", { method: "POST", body: buffer, headers: { "Content-Type": isXlsx ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv" } }); const d = await r.json(); setMsg(d.success ? `✅ Imported ${d.data?.imported || 0} calls` : d.error); setCsvFile(null); } finally { setCsvUploading(false); } }} disabled={!csvFile || csvUploading} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 py-2 rounded font-semibold text-white"> {csvUploading ? "Uploading..." : "Upload"} </button>
            {csvResult && <p className="text-sm text-emerald-100">✅ Imported: {csvResult.imported}</p>}
            <div className="text-xs text-slate-400 mt-6 p-3 bg-slate-800 rounded">
              <p className="font-semibold text-slate-200 mb-2">Supported Formats:</p>
              <p>📄 CSV: Date,Time,Direction,Duration,Phone,Manager,CallID</p>
              <p>📊 XLSX: Тип звонка,Кто,Кому,Внешний номер,Дата,Продолжительность,...</p>
              <p className="mt-2">💾 Can import 67,000+ rows</p>
            </div>
          </div>
        </div>
      )}

      {tab === "info" && (
        <div className="rounded-xl bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold">ℹ️ Umumiy ma'lumot</h2>
          <p className="mt-2 text-sm text-slate-400">
            Constructorni to‘ldirib saqlasangiz Dashboard hisoblashlari to‘g‘ri ishlaydi.
          </p>
        </div>
      )}

      {tab === "constructor" && (
        <div className="space-y-5 rounded-xl bg-slate-900/60 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">⚙️ Status Constructor</h2>
            <button
              onClick={loadMeta}
              className="rounded bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
              disabled={loadingMeta}
            >
              {loadingMeta ? "Reload..." : "Reload meta"}
            </button>
          </div>

          {loadingMeta ? (
            <p className="text-sm text-slate-300">Meta yuklanyapti...</p>
          ) : !meta ? (
            <p className="text-sm text-slate-300">Meta topilmadi. /api/meta ni tekshiring.</p>
          ) : (
            <>
              {/* ✅ Pipeline dropdown */}
              <div>
                <label className="mb-2 block text-sm text-slate-300">Pipeline (bitta tanlanadi)</label>
                <select
                  className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
                  value={selectedPipelineId}
                  onChange={(e) => onPipelineChange(e.target.value)}
                >
                  <option value="">-- Pipeline tanlanmagan --</option>
                  {meta.pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.id})
                    </option>
                  ))}
                </select>

                {!!constructorData.PIPELINE_IDS.length && (
                  <p className="mt-1 text-xs text-slate-400">
                    Statuslar shu pipeline bo‘yicha ko‘rsatiladi (agar meta’da pipeline_id bo‘lsa).
                  </p>
                )}
              </div>

              {/* Status groups */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Sifatli lid statuslari</label>
                  <div className="max-h-72 space-y-1 overflow-auto rounded bg-slate-800 p-2">
                    {filteredStatuses.map((st) => (
                      <label key={st.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={constructorData.QUALIFIED_STATUS_IDS.includes(st.id)}
                          onChange={() =>
                            setConstructorData((s) => ({
                              ...s,
                              QUALIFIED_STATUS_IDS: toggleId(s.QUALIFIED_STATUS_IDS, st.id),
                            }))
                          }
                        />
                        {st.name} (#{st.id})
                      </label>
                    ))}
                    {!filteredStatuses.length && (
                      <p className="text-xs text-slate-400 px-2 py-2">
                        Statuslar topilmadi. Pipeline tanlanmagan yoki meta formatini tekshirish kerak.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Sotib olgan (Won) statuslari</label>
                  <div className="max-h-72 space-y-1 overflow-auto rounded bg-slate-800 p-2">
                    {filteredStatuses.map((st) => (
                      <label key={st.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={constructorData.WON_STATUS_IDS.includes(st.id)}
                          onChange={() =>
                            setConstructorData((s) => ({
                              ...s,
                              WON_STATUS_IDS: toggleId(s.WON_STATUS_IDS, st.id),
                            }))
                          }
                        />
                        {st.name} (#{st.id})
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Yo‘qotilgan (Lost) statuslari</label>
                  <div className="max-h-72 space-y-1 overflow-auto rounded bg-slate-800 p-2">
                    {filteredStatuses.map((st) => (
                      <label key={st.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={constructorData.LOST_STATUS_IDS.includes(st.id)}
                          onChange={() =>
                            setConstructorData((s) => ({
                              ...s,
                              LOST_STATUS_IDS: toggleId(s.LOST_STATUS_IDS, st.id),
                            }))
                          }
                        />
                        {st.name} (#{st.id})
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loss reasons */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">“Sifatli” E’tiroz sabablari</label>
                  <div className="max-h-64 space-y-1 overflow-auto rounded bg-slate-800 p-2">
                    {meta.lossReasons.map((lr) => (
                      <label key={lr.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={constructorData.QUALIFIED_LOSS_REASON_IDS.includes(lr.id)}
                          onChange={() =>
                            setConstructorData((s) => ({
                              ...s,
                              QUALIFIED_LOSS_REASON_IDS: toggleId(
                                s.QUALIFIED_LOSS_REASON_IDS,
                                lr.id
                              ),
                            }))
                          }
                        />
                        {lr.name} (#{lr.id})
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">“Sifatsiz” E’tiroz sabablari</label>
                  <div className="max-h-64 space-y-1 overflow-auto rounded bg-slate-800 p-2">
                    {meta.lossReasons.map((lr) => (
                      <label key={lr.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={constructorData.NOT_QUALIFIED_REASON_IDS.includes(lr.id)}
                          onChange={() =>
                            setConstructorData((s) => ({
                              ...s,
                              NOT_QUALIFIED_REASON_IDS: toggleId(
                                s.NOT_QUALIFIED_REASON_IDS,
                                lr.id
                              ),
                            }))
                          }
                        />
                        {lr.name} (#{lr.id})
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom fields */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Lead Source field (Qayerdan)</label>
                  <select
                    className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
                    value={constructorData.LEAD_SOURCE_FIELD_ID ?? ""}
                    onChange={(e) =>
                      setConstructorData((s) => ({
                        ...s,
                        LEAD_SOURCE_FIELD_ID: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  >
                    <option value="">-- Tanlang --</option>
                    {meta.customFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} (#{f.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Course Type field (Kurs turi)</label>
                  <select
                    className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
                    value={constructorData.COURSE_TYPE_FIELD_ID ?? ""}
                    onChange={(e) =>
                      setConstructorData((s) => ({
                        ...s,
                        COURSE_TYPE_FIELD_ID: e.target.value ? Number(e.target.value) : null,
                        ONLINE_COURSE_ENUM_IDS: [],
                        OFFLINE_COURSE_ENUM_IDS: [],
                      }))
                    }
                  >
                    <option value="">-- Tanlang --</option>
                    {meta.customFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} (#{f.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Enum selection */}
              {selectedCourseField?.enums?.length ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Online kurs enumlari</label>
                    <div className="rounded bg-slate-800 p-2">
                      {selectedCourseField.enums.map((en) => (
                        <label key={en.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                          <input
                            type="checkbox"
                            checked={constructorData.ONLINE_COURSE_ENUM_IDS.includes(en.id)}
                            onChange={() =>
                              setConstructorData((s) => ({
                                ...s,
                                ONLINE_COURSE_ENUM_IDS: toggleId(s.ONLINE_COURSE_ENUM_IDS, en.id),
                              }))
                            }
                          />
                          {en.value} (#{en.id})
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Offline kurs enumlari</label>
                    <div className="rounded bg-slate-800 p-2">
                      {selectedCourseField.enums.map((en) => (
                        <label key={en.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                          <input
                            type="checkbox"
                            checked={constructorData.OFFLINE_COURSE_ENUM_IDS.includes(en.id)}
                            onChange={() =>
                              setConstructorData((s) => ({
                                ...s,
                                OFFLINE_COURSE_ENUM_IDS: toggleId(s.OFFLINE_COURSE_ENUM_IDS, en.id),
                              }))
                            }
                          />
                          {en.value} (#{en.id})
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                constructorData.COURSE_TYPE_FIELD_ID && (
                  <p className="text-xs text-slate-400">Kurs turi fieldida enumlar topilmadi.</p>
                )
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={constructorData.USE_AMO_CALLS}
                    onChange={(e) =>
                      setConstructorData((s) => ({ ...s, USE_AMO_CALLS: e.target.checked }))
                    }
                  />
                  amoCRM qo‘ng‘iroqlarini ishlatish
                </label>

                <label className="flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={constructorData.USE_SHEETS_CALLS}
                    onChange={(e) =>
                      setConstructorData((s) => ({ ...s, USE_SHEETS_CALLS: e.target.checked }))
                    }
                  />
                  Google Sheets qo‘ng‘iroqlarini ishlatish
                </label>
              </div>

              <div className="pt-2">
                <button
                  onClick={saveConstructor}
                  disabled={saving}
                  className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {saving ? "Saqlanyapti..." : "Constructorni saqlash"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "tushum" && (
        <div className="space-y-4 rounded-xl bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold">💵 Tushum (Sheets integratsiya)</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300">Google Sheets havolasi</label>
              <input
                type="text"
                className="w-full rounded bg-slate-800 px-3 py-2"
                value={tushum.link}
                onChange={(e) => setTushum({ ...tushum, link: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Menejer ustuni</label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2"
                  value={tushum.managerColumn}
                  onChange={(e) => setTushum({ ...tushum, managerColumn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Sana ustuni</label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2"
                  value={tushum.dateColumn}
                  onChange={(e) => setTushum({ ...tushum, dateColumn: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">To‘lov turi ustuni</label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2"
                  value={tushum.paymentTypeColumn}
                  onChange={(e) => setTushum({ ...tushum, paymentTypeColumn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Tushum turi ustuni</label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2"
                  value={tushum.incomeTypeColumn}
                  onChange={(e) => setTushum({ ...tushum, incomeTypeColumn: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Summasi ustuni</label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2"
                  value={tushum.amountColumn}
                  onChange={(e) => setTushum({ ...tushum, amountColumn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Kurs turi ustuni</label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2"
                  value={tushum.courseTypeColumn}
                  onChange={(e) => setTushum({ ...tushum, courseTypeColumn: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveTushum}
            disabled={saving}
            className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? "Saqlanyapti..." : "Tushumni saqlash"}
          </button>
        </div>
      )}
    </main>
  );
}