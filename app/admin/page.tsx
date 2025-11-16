"use client";

import { useMemo, useState } from "react";
import { dashboardConfig } from "@/config/dashboardConfig";
import { STAGE_OPTIONS, LOSS_REASON_OPTIONS, Option } from "@/config/options";

type Tab = "info" | "builder";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("info");

  // Multi-selects: store ids
  const [wonStageIds, setWonStageIds] = useState<number[]>(
    dashboardConfig.WON_STATUS_IDS
  );
  const [qualifiedStageIds, setQualifiedStageIds] = useState<number[]>(
    dashboardConfig.QUALIFIED_STATUS_IDS
  );
  const [qualifiedReasonIds, setQualifiedReasonIds] = useState<number[]>(
    dashboardConfig.QUALIFIED_LOSS_REASON_IDS
  );
  const [notQualifiedReasonIds, setNotQualifiedReasonIds] = useState<
    number[]
  >(dashboardConfig.NOT_QUALIFIED_REASON_IDS);

  // Other fields keep as simple text
  const [onlineStatuses, setOnlineStatuses] = useState(
    dashboardConfig.ONLINE_DEAL_STATUS_IDS.join(", ")
  );
  const [offlineStatuses, setOfflineStatuses] = useState(
    dashboardConfig.OFFLINE_DEAL_STATUS_IDS.join(", ")
  );
  const [pipelines, setPipelines] = useState(
    dashboardConfig.PIPELINE_IDS.join(", ")
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

    const onlineIds = toIds(onlineStatuses);
    const offlineIds = toIds(offlineStatuses);
    const pipelineIds = toIds(pipelines);

    const leadSourceIdNum = parseInt(leadSourceFieldId || "", 10);
    const leadSourceIdStr =
      !Number.isNaN(leadSourceIdNum) && leadSourceFieldId.trim().length > 0
        ? leadSourceFieldId.trim()
        : "null";

    const arr = (ids: number[]) => ids.join(", ");

    return `// config/dashboardConfig.ts

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  QUALIFIED_LOSS_REASON_IDS: number[];
  NOT_QUALIFIED_REASON_IDS: number[];
  ONLINE_DEAL_STATUS_IDS: number[];
  OFFLINE_DEAL_STATUS_IDS: number[];
  PIPELINE_IDS: number[];
  LEAD_SOURCE_FIELD_ID: number | null;
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  WON_STATUS_IDS: [${arr(wonStageIds)}],
  QUALIFIED_STATUS_IDS: [${arr(qualifiedStageIds)}],
  QUALIFIED_LOSS_REASON_IDS: [${arr(qualifiedReasonIds)}],
  NOT_QUALIFIED_REASON_IDS: [${arr(notQualifiedReasonIds)}],
  ONLINE_DEAL_STATUS_IDS: [${onlineIds.join(", ")}],
  OFFLINE_DEAL_STATUS_IDS: [${offlineIds.join(", ")}],
  PIPELINE_IDS: [${pipelineIds.join(", ")}],
  LEAD_SOURCE_FIELD_ID: ${leadSourceIdStr},
  USE_AMO_CALLS: ${useAmoCalls},
  USE_SHEETS_CALLS: ${useSheetsCalls},
};`;
  }, [
    wonStageIds,
    qualifiedStageIds,
    qualifiedReasonIds,
    notQualifiedReasonIds,
    onlineStatuses,
    offlineStatuses,
    pipelines,
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
            In this section you choose <strong>stages</strong> and{" "}
            <strong>loss reasons</strong>. Below you will get ready{" "}
            <code>dashboardConfig.ts</code> code – copy it into the project
            file (GitHub → commit → push).
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <MultiSelect
              label="WON_STATUS_IDS (stages counted as Won)"
              options={STAGE_OPTIONS}
              selectedIds={wonStageIds}
              setSelectedIds={setWonStageIds}
              placeholder="Choose stages from Sotuv funnel"
            />
            <MultiSelect
              label="QUALIFIED_STATUS_IDS (stages counted as Qualified)"
              options={STAGE_OPTIONS}
              selectedIds={qualifiedStageIds}
              setSelectedIds={setQualifiedStageIds}
              placeholder="Choose 'O‘ylab ko‘radi', 'Coachingga qiziqdi', ..."
            />
            <MultiSelect
              label="QUALIFIED_LOSS_REASON_IDS (lost reasons that still mean Qualified lead)"
              options={LOSS_REASON_OPTIONS}
              selectedIds={qualifiedReasonIds}
              setSelectedIds={setQualifiedReasonIds}
              placeholder="Choose E'tiroz sababi for qualified but lost leads"
            />
            <MultiSelect
              label="NOT_QUALIFIED_REASON_IDS (lost reasons for Not Qualified leads)"
              options={LOSS_REASON_OPTIONS}
              selectedIds={notQualifiedReasonIds}
              setSelectedIds={setNotQualifiedReasonIds}
              placeholder="Choose E'tiroz sababi for NOT qualified leads"
            />

            <Field
              label="ONLINE_DEAL_STATUS_IDS (online course deals – status ids)"
              value={onlineStatuses}
              onChange={setOnlineStatuses}
              placeholder="e.g. 555555, 777777"
            />
            <Field
              label="OFFLINE_DEAL_STATUS_IDS (offline course deals – status ids)"
              value={offlineStatuses}
              onChange={setOfflineStatuses}
              placeholder="e.g. 888888"
            />
            <Field
              label="PIPELINE_IDS (leave empty → all pipelines)"
              value={pipelines}
              onChange={setPipelines}
              placeholder="pipeline ids: 123456, 987654"
            />
            <Field
              label="LEAD_SOURCE_FIELD_ID ({Qayerdan} custom field id)"
              value={leadSourceFieldId}
              onChange={setLeadSourceFieldId}
              placeholder="e.g. 1234567"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={useAmoCalls}
                onChange={(e) => setUseAmoCalls(e.target.checked)}
              />
              Use amoCRM calls (call_in, call_out)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={useSheetsCalls}
                onChange={(e) => setUseSheetsCalls(e.target.checked)}
              />
              Use Google Sheets successful calls
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold">
                Generated config (dashboardConfig.ts)
              </h3>
              <button
                onClick={handleCopy}
                className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
              >
                Copy code
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

// ───────────────── helpers ─────────────────

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

function MultiSelect({
  label,
  options,
  selectedIds,
  setSelectedIds,
  placeholder,
}: {
  label: string;
  options: Option[];
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const toggleId = (id: number) => {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const selectedLabels = options
    .filter((o) => selectedIds.includes(o.id))
    .map((o) => o.name);

  const buttonText =
    selectedLabels.length === 0
      ? placeholder || "Choose…"
      : selectedLabels.length <= 2
      ? selectedLabels.join(", ")
      : `${selectedLabels.slice(0, 2).join(", ")} + ${
          selectedLabels.length - 2
        } more`;

  return (
    <div className="space-y-1 text-sm relative">
      <div className="font-semibold text-slate-700">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded border px-3 py-2 text-left text-sm bg-white"
      >
        {buttonText}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-500">
              Add options in config/options.ts
            </div>
          )}
          {options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 px-3 py-1 text-sm hover:bg-slate-100"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(opt.id)}
                onChange={() => toggleId(opt.id)}
              />
              <span>
                {opt.name}{" "}
                <span className="text-xs text-slate-400">({opt.id})</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoSection() {
  return (
    <section className="space-y-4">
      <div className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">amoCRM data</h2>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          <li>
            API: <code>/api/v4/leads</code>, filter{" "}
            <code>created_at[from,to]</code>.
          </li>
          <li>
            Configuration file:{" "}
            <code>config/dashboardConfig.ts</code> – here we store which
            stages and reasons mean <strong>Won / Qualified / Not qualified</strong>.
          </li>
          <li>
            Env variables: <code>AMO_BASE_URL</code>,{" "}
            <code>AMO_LONG_LIVED_TOKEN</code>.
          </li>
        </ul>
      </div>

      <div className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Calls (amoCRM + Google Sheets)</h2>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          <li>
            amoCRM calls: <code>/api/v4/leads/notes</code> with{" "}
            <code>note_type=call_in, call_out</code>.
          </li>
          <li>
            Google Sheets env variables:{" "}
            <code>SHEETS_API_KEY</code>,{" "}
            <code>SHEETS_SPREADSHEET_ID</code>,{" "}
            <code>SHEETS_CALLS_RANGE</code>.
          </li>
        </ul>
      </div>
    </section>
  );
}
