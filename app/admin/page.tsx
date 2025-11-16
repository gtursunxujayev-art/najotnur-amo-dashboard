"use client";

import { useMemo, useState } from "react";
import { dashboardConfig } from "@/config/dashboardConfig";

type Tab = "info" | "builder";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("info");

  const [won, setWon] = useState(
    dashboardConfig.WON_STATUS_IDS.join(", ")
  );
  const [qualified, setQualified] = useState(
    dashboardConfig.QUALIFIED_STATUS_IDS.join(", ")
  );
  const [notQualified, setNotQualified] = useState(
    dashboardConfig.NOT_QUALIFIED_STATUS_IDS.join(", ")
  );
  const [online, setOnline] = useState(
    dashboardConfig.ONLINE_DEAL_STATUS_IDS.join(", ")
  );
  const [offline, setOffline] = useState(
    dashboardConfig.OFFLINE_DEAL_STATUS_IDS.join(", ")
  );
  const [pipelines, setPipelines] = useState(
    dashboardConfig.PIPELINE_IDS.join(", ")
  );
  const [nonQualReasons, setNonQualReasons] = useState(
    (dashboardConfig.NON_QUALIFIED_REASON_MAIN_IDS || []).join(", ")
  );
  const [leadSourceFieldId, setLeadSourceFieldId] = useState(
    dashboardConfig.LEAD_SOURCE_FIELD_ID != null
      ? String(dashboardConfig.LEAD_SOURCE_FIELD_ID)
      : ""
  );

  const [useAmoCalls, setUseAmoCalls] = useState(
    dashboardConfig.USE_AMO_CALLS
  );
  const [useSheetsCalls, setUseSheetsCalls] = useState(
    dashboardConfig.USE_SHEETS_CALLS
  );

  const configText = useMemo(() => {
    const toIds = (input: string): number[] =>
      input
        .split(/[,\s]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n));

    const wonIds = toIds(won);
    const qualIds = toIds(qualified);
    const notQualIds = toIds(notQualified);
    const onlineIds = toIds(online);
    const offlineIds = toIds(offline);
    const pipelineIds = toIds(pipelines);
    const nonQualReasonIds = toIds(nonQualReasons);
    const leadSourceIdNum = parseInt(leadSourceFieldId || "", 10);
    const leadSourceIdStr =
      !Number.isNaN(leadSourceIdNum) && leadSourceFieldId.trim().length > 0
        ? leadSourceFieldId.trim()
        : "null";

    return `// config/dashboardConfig.ts

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  NOT_QUALIFIED_STATUS_IDS: number[];
  ONLINE_DEAL_STATUS_IDS: number[];
  OFFLINE_DEAL_STATUS_IDS: number[];
  PIPELINE_IDS: number[];
  NON_QUALIFIED_REASON_MAIN_IDS: number[];
  LEAD_SOURCE_FIELD_ID: number | null;
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  WON_STATUS_IDS: [${wonIds.join(", ")}],
  QUALIFIED_STATUS_IDS: [${qualIds.join(", ")}],
  NOT_QUALIFIED_STATUS_IDS: [${notQualIds.join(", ")}],
  ONLINE_DEAL_STATUS_IDS: [${onlineIds.join(", ")}],
  OFFLINE_DEAL_STATUS_IDS: [${offlineIds.join(", ")}],
  PIPELINE_IDS: [${pipelineIds.join(", ")}],
  NON_QUALIFIED_REASON_MAIN_IDS: [${nonQualReasonIds.join(", ")}],
  LEAD_SOURCE_FIELD_ID: ${leadSourceIdStr},
  USE_AMO_CALLS: ${useAmoCalls},
  USE_SHEETS_CALLS: ${useSheetsCalls},
};`;
  }, [
    won,
    qualified,
    notQualified,
    online,
    offline,
    pipelines,
    nonQualReasons,
    leadSourceFieldId,
    useAmoCalls,
    useSheetsCalls,
  ]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(configText);
    alert(
      "Config copied! Paste it into config/dashboardConfig.ts and commit + push."
    );
  };

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Dashboard Admin</h1>

        <div className="inline-flex rounded-lg bg-slate-800 p-1">
          <TabButton
            label="Info"
            active={tab === "info"}
            onClick={() => setTab("info")}
          />
          <TabButton
            label="Constructor"
            active={tab === "builder"}
            onClick={() => setTab("builder")}
          />
        </div>
      </header>

      {tab === "info" && <InfoSection />}

      {tab === "builder" && (
        <section className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold">
            Constructor – generate dashboardConfig.ts
          </h2>

          <p className="text-sm text-slate-600">
            Bu bo‘limda status ID larni va maydon ID larini kiritasiz. Pastda
            tayyor <code>dashboardConfig.ts</code> kodini nusxa ko‘chirib,
            loyihadagi faylga qo‘yasiz (GitHub → commit → push).
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="WON_STATUS_IDS (kelishuv statuslari)"
              value={won}
              onChange={setWon}
              placeholder="masalan: 142, 555555"
            />
            <Field
              label="QUALIFIED_STATUS_IDS (sifatli lidlar statuslari)"
              value={qualified}
              onChange={setQualified}
              placeholder="O‘ylab ko‘radi, Coachingga qiziqdi, ..."
            />
            <Field
              label="NOT_QUALIFIED_STATUS_IDS (sifatsiz lidlar statuslari)"
              value={notQualified}
              onChange={setNotQualified}
              placeholder="Muvaffaqiyatsiz bosqich statuslari"
            />
            <Field
              label="ONLINE_DEAL_STATUS_IDS (online kurs kelishuvlari)"
              value={online}
              onChange={setOnline}
              placeholder="status ID lar ro‘yxati"
            />
            <Field
              label="OFFLINE_DEAL_STATUS_IDS (offline kurs kelishuvlari)"
              value={offline}
              onChange={setOffline}
              placeholder="status ID lar ro‘yxati"
            />
            <Field
              label="PIPELINE_IDS (bo‘limlar, bo‘sh qoldirsangiz – hammasi)"
              value={pipelines}
              onChange={setPipelines}
              placeholder="pipeline ID lar, masalan: 123456, 987654"
            />
            <Field
              label="NON_QUALIFIED_REASON_MAIN_IDS (asosiy e'tiroz sabablari – loss_reason_id)"
              value={nonQualReasons}
              onChange={setNonQualReasons}
              placeholder="masalan: 1, 2, 3 – boshqalar 'Boshqa sabablar' bo‘ladi"
            />
            <Field
              label="LEAD_SOURCE_FIELD_ID ({Qayerdan} maydon field_id)"
              value={leadSourceFieldId}
              onChange={setLeadSourceFieldId}
              placeholder="masalan: 1234567"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={useAmoCalls}
                onChange={(e) => setUseAmoCalls(e.target.checked)}
              />
              amoCRM qo‘ng‘iroqlari (call_in, call_out) dan foydalanish
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={useSheetsCalls}
                onChange={(e) => setUseSheetsCalls(e.target.checked)}
              />
              Google Sheets dagi muvaffaqiyatli qo‘ng‘iroqlardan foydalanish
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold">
                Yaratilgan config (dashboardConfig.ts)
              </h3>
              <button
                onClick={handleCopy}
                className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
              >
                Kodni nusxa ko‘chirish
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {configText}
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}

function TabButton({
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
      className={`rounded-md px-3 py-1 text-xs font-semibold ${
        active ? "bg-white text-slate-900" : "text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <div className="font-semibold text-slate-700">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border px-2 py-1 text-sm"
      />
    </label>
  );
}

function InfoSection() {
  return (
    <section className="space-y-4">
      <div className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">amoCRM maʼlumotlari</h2>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          <li>
            API: <code>/api/v4/leads</code>, filter{" "}
            <code>created_at[from,to]</code>.
          </li>
          <li>
            Konfiguratsiya fayli:{" "}
            <code>config/dashboardConfig.ts</code> – bu yerda status ID
            larini <strong>WON / QUALIFIED / NOT QUALIFIED / ONLINE /
            OFFLINE</strong> ga bogʻlaysiz.
          </li>
          <li>
            Env o‘zgaruvchilar:{" "}
            <code>AMO_BASE_URL</code>, <code>AMO_LONG_LIVED_TOKEN</code>.
          </li>
        </ul>
      </div>

      <div className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">
          Qo‘ng‘iroqlar (amoCRM + Google Sheets)
        </h2>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          <li>
            amoCRM qo‘ng‘iroqlari:{" "}
            <code>/api/v4/leads/notes</code> –{" "}
            <code>note_type=call_in, call_out</code>.
          </li>
          <li>
            Google Sheets env o‘zgaruvchilar:{" "}
            <code>SHEETS_API_KEY</code>,{" "}
            <code>SHEETS_SPREADSHEET_ID</code>,{" "}
            <code>SHEETS_CALLS_RANGE</code>.
          </li>
          <li>
            Jadval ustunlari:
            <br />
            <code>A – datetime</code> (YYYY-MM-DD HH:MM),{" "}
            <code>B – menejer nomi</code>,{" "}
            <code>C – davomiyligi (sekund)</code>,{" "}
            <code>D – natija (success/fail)</code>.
          </li>
        </ul>
      </div>

      <div className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Qanday o‘zgartirish kerak?</h2>
        <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
          <li>
            <strong>Constructor</strong> bo‘limida status ID larni,
            pipeline ID larni, asosiy e'tiroz sabablari va {`{Qayerdan}`} field
            ID sini kiriting.
          </li>
          <li>
            Yaratilgan kodni nusxa ko‘chirib,{" "}
            <code>config/dashboardConfig.ts</code> fayliga qo‘ying.
          </li>
          <li>
            GitHubda <strong>commit + push</strong> qiling, Vercel
            avtomatik redeploy qiladi.
          </li>
        </ol>
      </div>
    </section>
  );
}
