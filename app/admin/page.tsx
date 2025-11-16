"use client";

import { useEffect, useMemo, useState } from "react";
import { dashboardConfig } from "@/config/dashboardConfig";

type Tab = "info" | "builder";

type Option = {
  id: number;
  name: string;
};

type CustomFieldEnum = {
  id: number;
  value: string;
};

type CustomField = {
  id: number;
  name: string;
  type: string;
  enums: CustomFieldEnum[];
};

type MetaResponse = {
  pipelines: Option[];
  sotuvPipelineId?: number | null;
  statuses: Option[];
  lossReasons: Option[];
  customFields: CustomField[];
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("info");

  const [metaError, setMetaError] = useState<string | null>(null);

  // Pipelines & stages
  const [pipelines, setPipelines] = useState<Option[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(
    dashboardConfig.PIPELINE_IDS[0] ?? null
  );
  const [stages, setStages] = useState<Option[]>([]);
  const [reasons, setReasons] = useState<Option[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Stage / reason selections
  const [wonStageIds, setWonStageIds] = useState<number[]>(
    dashboardConfig.WON_STATUS_IDS
  );
  const [qualifiedStageIds, setQualifiedStageIds] = useState<number[]>(
    dashboardConfig.QUALIFIED_STATUS_IDS
  );
  const [qualifiedReasonIds, setQualifiedReasonIds] = useState<number[]>(
    dashboardConfig.QUALIFIED_LOSS_REASON_IDS
  );
  const [notQualifiedReasonIds, setNotQualifiedReasonIds] = useState<number[]>(
    dashboardConfig.NOT_QUALIFIED_REASON_IDS
  );

  // Lead source field (Qayerdan)
  const [leadSourceFieldId, setLeadSourceFieldId] = useState<number | null>(
    dashboardConfig.LEAD_SOURCE_FIELD_ID
  );

  // Kurs turi field + enums
  const [courseTypeFieldId, setCourseTypeFieldId] = useState<number | null>(
    dashboardConfig.COURSE_TYPE_FIELD_ID
  );
  const [courseTypeEnums, setCourseTypeEnums] = useState<Option[]>([]);
  const [onlineCourseEnumIds, setOnlineCourseEnumIds] = useState<number[]>(
    dashboardConfig.ONLINE_COURSE_ENUM_IDS ?? []
  );
  const [offlineCourseEnumIds, setOfflineCourseEnumIds] = useState<number[]>(
    dashboardConfig.OFFLINE_COURSE_ENUM_IDS ?? []
  );

  // Calls usage
  const [useAmoCalls, setUseAmoCalls] = useState(
    dashboardConfig.USE_AMO_CALLS
  );
  const [useSheetsCalls, setUseSheetsCalls] = useState(
    dashboardConfig.USE_SHEETS_CALLS
  );

  // Saving to GitHub
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // ─────────── Load meta from backend ───────────

  async function loadMeta(pipelineId?: number | null) {
    try {
      setMetaError(null);

      const url =
        pipelineId != null
          ? `/api/meta?pipelineId=${pipelineId}`
          : "/api/meta";

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load /api/meta");
      }

      const data: MetaResponse = await res.json();

      setPipelines(data.pipelines || []);
      setStages(data.statuses || []);
      setReasons(data.lossReasons || []);
      setCustomFields(data.customFields || []);

      const effectivePipelineId =
        pipelineId ??
        dashboardConfig.PIPELINE_IDS[0] ??
        data.sotuvPipelineId ??
        data.pipelines?.[0]?.id ??
        null;

      setSelectedPipelineId(effectivePipelineId);
    } catch (err: any) {
      console.error("Admin meta error:", err);
      setMetaError("Failed to load stages / reasons / fields from amoCRM.");
    }
  }

  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When courseTypeFieldId or customFields change → update enums list
  useEffect(() => {
    if (!courseTypeFieldId) {
      setCourseTypeEnums([]);
      return;
    }
    const cf = customFields.find((f) => f.id === courseTypeFieldId);
    if (!cf) {
      setCourseTypeEnums([]);
      return;
    }
    setCourseTypeEnums(
      (cf.enums || []).map((e) => ({ id: e.id, name: e.value }))
    );
  }, [courseTypeFieldId, customFields]);

  // ─────────── Generated config text ───────────

  const configText = useMemo(() => {
    const pipelineIds =
      selectedPipelineId && !Number.isNaN(selectedPipelineId)
        ? [selectedPipelineId]
        : [];

    const arr = (ids: number[]) => ids.join(", ");

    const leadSourceFieldLiteral =
      leadSourceFieldId !== null ? leadSourceFieldId : "null";

    const courseTypeFieldLiteral =
      courseTypeFieldId !== null ? courseTypeFieldId : "null";

    return `// config/dashboardConfig.ts

export type DashboardConfig = {
  WON_STATUS_IDS: number[];
  QUALIFIED_STATUS_IDS: number[];
  QUALIFIED_LOSS_REASON_IDS: number[];
  NOT_QUALIFIED_REASON_IDS: number[];
  ONLINE_DEAL_STATUS_IDS: number[]; // deprecated, kept for compatibility
  OFFLINE_DEAL_STATUS_IDS: number[]; // deprecated, kept for compatibility
  PIPELINE_IDS: number[];
  LEAD_SOURCE_FIELD_ID: number | null;
  COURSE_TYPE_FIELD_ID: number | null;
  ONLINE_COURSE_ENUM_IDS: number[];
  OFFLINE_COURSE_ENUM_IDS: number[];
  USE_AMO_CALLS: boolean;
  USE_SHEETS_CALLS: boolean;
};

export const dashboardConfig: DashboardConfig = {
  WON_STATUS_IDS: [${arr(wonStageIds)}],
  QUALIFIED_STATUS_IDS: [${arr(qualifiedStageIds)}],
  QUALIFIED_LOSS_REASON_IDS: [${arr(qualifiedReasonIds)}],
  NOT_QUALIFIED_REASON_IDS: [${arr(notQualifiedReasonIds)}],
  ONLINE_DEAL_STATUS_IDS: [], // now we use Kurs turi enums instead
  OFFLINE_DEAL_STATUS_IDS: [], // now we use Kurs turi enums instead
  PIPELINE_IDS: [${pipelineIds.join(", ")}],
  LEAD_SOURCE_FIELD_ID: ${leadSourceFieldLiteral},
  COURSE_TYPE_FIELD_ID: ${courseTypeFieldLiteral},
  ONLINE_COURSE_ENUM_IDS: [${arr(onlineCourseEnumIds)}],
  OFFLINE_COURSE_ENUM_IDS: [${arr(offlineCourseEnumIds)}],
  USE_AMO_CALLS: ${useAmoCalls},
  USE_SHEETS_CALLS: ${useSheetsCalls},
};`;
  }, [
    wonStageIds,
    qualifiedStageIds,
    qualifiedReasonIds,
    notQualifiedReasonIds,
    selectedPipelineId,
    leadSourceFieldId,
    courseTypeFieldId,
    onlineCourseEnumIds,
    offlineCourseEnumIds,
    useAmoCalls,
    useSheetsCalls,
  ]);

  const handleCopyConfig = async () => {
    await navigator.clipboard.writeText(configText);
    alert(
      "Config copied! If needed you can paste it manually into config/dashboardConfig.ts."
    );
  };

  const handleSaveToDashboard = async () => {
    try {
      setSaving(true);
      setSaveStatus(null);
      const res = await fetch("/api/admin/save-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ configText }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSaveStatus(
          "Error saving config: " + (data.error || res.statusText)
        );
        return;
      }

      setSaveStatus(
        "Saved! Vercel will redeploy automatically in about 1–2 minutes."
      );
    } catch (err: any) {
      setSaveStatus("Unexpected error: " + String(err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const pipelineOptions = pipelines;

  const leadFieldOptions: Option[] = customFields.map((f) => ({
    id: f.id,
    name: `${f.name} (${f.id})`,
  }));

  const courseFieldOptions: Option[] = customFields
    .filter((f) => (f.enums || []).length > 0)
    .map((f) => ({
      id: f.id,
      name: `${f.name} (${f.id})`,
    }));

  return (
    <main className="min-h-screen space-y-6 bg-slate-950 px-4 py-6 text-slate-50">
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
        <section className="space-y-4 rounded-lg bg-slate-900 p-4 shadow-sm">
          <h2 className="text-xl font-semibold">
            Constructor – generate dashboardConfig.ts
          </h2>

          <p className="text-sm text-slate-300">
            This constructor uses <strong>stages</strong>,{" "}
            <strong>loss reasons</strong> and{" "}
            <strong>lead custom fields</strong> loaded directly from amoCRM.
            After you adjust the values, click{" "}
            <strong>“Save to dashboard”</strong> – the config will be committed
            to GitHub and Vercel will redeploy automatically.
          </p>

          {metaError && (
            <div className="rounded border border-red-500 bg-red-900/40 p-3 text-xs text-red-100">
              {metaError}
            </div>
          )}

          {/* Pipeline selection */}
          <div className="space-y-2 rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <h3 className="font-semibold text-slate-100">
              1. Choose funnel (pipeline)
            </h3>
            <SingleSelect
              label="Pipeline for this dashboard"
              options={pipelineOptions}
              selectedId={selectedPipelineId}
              onChange={(id) => {
                setSelectedPipelineId(id);
                loadMeta(id);
              }}
              placeholder="Choose Sotuv pipeline"
            />
            <p className="text-xs text-slate-400">
              All metrics will be calculated only for leads in this pipeline.
            </p>
          </div>

          {/* Stages & reasons */}
          <div className="grid gap-4 md:grid-cols-2">
            <MultiSelect
              label="WON_STATUS_IDS (stages counted as Won)"
              options={stages}
              selectedIds={wonStageIds}
              setSelectedIds={setWonStageIds}
              placeholder="Choose stages like 'SOTIB OLDI'"
            />

            <MultiSelect
              label="QUALIFIED_STATUS_IDS (stages counted as Qualified leads)"
              options={stages}
              selectedIds={qualifiedStageIds}
              setSelectedIds={setQualifiedStageIds}
              placeholder="Choose O'ylab ko'radi, Online qiziqish bildirdi, ..."
            />

            <MultiSelect
              label="QUALIFIED_LOSS_REASON_IDS (lost reasons that still mean Qualified lead)"
              options={reasons}
              selectedIds={qualifiedReasonIds}
              setSelectedIds={setQualifiedReasonIds}
              placeholder="Choose E'tiroz sababi for qualified but lost leads"
            />

            <MultiSelect
              label="NOT_QUALIFIED_REASON_IDS (lost reasons for NOT qualified leads)"
              options={reasons}
              selectedIds={notQualifiedReasonIds}
              setSelectedIds={setNotQualifiedReasonIds}
              placeholder="Choose E'tiroz sababi for NOT qualified leads"
            />
          </div>

          {/* Lead source and Kurs turi mapping */}
          <div className="grid gap-4 md:grid-cols-2">
            <SingleSelect
              label="LEAD_SOURCE_FIELD_ID ({Qayerdan} custom field)"
              options={leadFieldOptions}
              selectedId={leadSourceFieldId}
              onChange={setLeadSourceFieldId}
              placeholder="Choose field like 'Qayerdan'"
            />

            <SingleSelect
              label="COURSE_TYPE_FIELD_ID ({Kurs turi} field for online/offline)"
              options={courseFieldOptions}
              selectedId={courseTypeFieldId}
              onChange={(id) => {
                setCourseTypeFieldId(id);
                setOnlineCourseEnumIds([]);
                setOfflineCourseEnumIds([]);
              }}
              placeholder="Choose field like 'Kurs turi'"
            />
          </div>

          {courseTypeFieldId && (
            <div className="grid gap-4 md:grid-cols-2">
              <MultiSelect
                label="ONLINE_COURSE_ENUM_IDS (Kurs turi options = online)"
                options={courseTypeEnums}
                selectedIds={onlineCourseEnumIds}
                setSelectedIds={setOnlineCourseEnumIds}
                placeholder="Choose options that mean ONLINE course"
              />
              <MultiSelect
                label="OFFLINE_COURSE_ENUM_IDS (Kurs turi options = offline)"
                options={courseTypeEnums}
                selectedIds={offlineCourseEnumIds}
                setSelectedIds={setOfflineCourseEnumIds}
                placeholder="Choose options that mean OFFLINE course"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                checked={useAmoCalls}
                onChange={(e) => setUseAmoCalls(e.target.checked)}
              />
              Use amoCRM calls (call_in, call_out)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                checked={useSheetsCalls}
                onChange={(e) => setUseSheetsCalls(e.target.checked)}
              />
              Use Google Sheets successful calls
            </label>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-slate-100">
                Generated config (dashboardConfig.ts)
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopyConfig}
                  className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900"
                >
                  Copy config text
                </button>
                <button
                  onClick={handleSaveToDashboard}
                  disabled={saving}
                  className={`rounded px-3 py-1 text-xs font-semibold ${
                    saving
                      ? "bg-slate-600 text-slate-300"
                      : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"
                  }`}
                >
                  {saving ? "Saving..." : "Save to dashboard"}
                </button>
              </div>
            </div>
            {saveStatus && (
              <p className="mb-2 text-xs text-slate-300">{saveStatus}</p>
            )}
            <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
{configText}
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}

// ─────────── UI helpers ───────────

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
      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-200 hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
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
    <div className="relative space-y-1 text-sm">
      <div className="font-semibold text-slate-100">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-left text-sm text-slate-100 placeholder:text-slate-500"
      >
        {buttonText}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-slate-600 bg-slate-900 shadow-lg">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">
              No options loaded.
            </div>
          )}
          {options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 px-3 py-1 text-sm text-slate-100 hover:bg-slate-800"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                checked={selectedIds.includes(opt.id)}
                onChange={() => toggleId(opt.id)}
              />
              <span>
                {opt.name}{" "}
                <span className="text-xs text-slate-500">({opt.id})</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleSelect({
  label,
  options,
  selectedId,
  onChange,
  placeholder,
}: {
  label: string;
  options: Option[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    options.find((o) => o.id === selectedId)?.name || placeholder || "Choose…";

  return (
    <div className="relative space-y-1 text-sm">
      <div className="font-semibold text-slate-100">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-left text-sm text-slate-100"
      >
        {selectedLabel}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-slate-600 bg-slate-900 shadow-lg">
          <button
            className="w-full px-3 py-1 text-left text-xs text-slate-400 hover:bg-slate-800"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            — Clear —
          </button>
          {options.map((opt) => (
            <button
              key={opt.id}
              className="flex w-full items-center gap-2 px-3 py-1 text-left text-sm text-slate-100 hover:bg-slate-800"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
            >
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoSection() {
  return (
    <section className="space-y-4">
      <div className="space-y-2 rounded-lg bg-slate-900 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-100">amoCRM data</h2>
        <ul className="list-disc pl-5 text-sm text-slate-300">
          <li>
            Stages and loss reasons are read from amoCRM via{" "}
            <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
              /api/meta
            </code>
            .
          </li>
          <li>
            You can choose the funnel, lead source field (<b>Qayerdan</b>) and
            course type field (<b>Kurs turi</b>) from real CRM custom fields.
          </li>
          <li>
            After you click{" "}
            <strong className="font-semibold">“Save to dashboard”</strong>,
            config is committed to GitHub and Vercel redeploys. In 1–2 minutes
            the <b>Dashboard</b> page will use the new settings.
          </li>
        </ul>
      </div>
    </section>
  );
}
