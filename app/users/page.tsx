// app/users/page.tsx
"use client";

import { useEffect, useState } from "react";

type TelegramUser = {
  id: number;
  chatId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  dailyReport: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
};

type ManualPeriodKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth";

const PERIOD_OPTIONS: { value: ManualPeriodKey; label: string }[] = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "thisWeek", label: "Joriy hafta" },
  { value: "lastWeek", label: "O‘tgan hafta" },
  { value: "thisMonth", label: "Joriy oy" },
  { value: "lastMonth", label: "O‘tgan oy" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [periodByUser, setPeriodByUser] = useState<Record<number, ManualPeriodKey>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/report-users");
      const data = await res.json();
      const list: TelegramUser[] = data.users || [];
      setUsers(list);

      // default period = "today" for all
      const map: Record<number, ManualPeriodKey> = {};
      for (const u of list) {
        map[u.id] = "today";
      }
      setPeriodByUser(map);
    } catch (err: any) {
      console.error("[users] load error", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateUser = async (
    u: TelegramUser,
    patch: Partial<Pick<TelegramUser, "dailyReport" | "weeklyReport" | "monthlyReport">>
  ) => {
    try {
      setSavingId(u.id);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/report-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: u.chatId,
          ...patch,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Update failed");
      }

      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id
            ? {
                ...x,
                dailyReport:
                  typeof patch.dailyReport === "boolean"
                    ? patch.dailyReport
                    : x.dailyReport,
                weeklyReport:
                  typeof patch.weeklyReport === "boolean"
                    ? patch.weeklyReport
                    : x.weeklyReport,
                monthlyReport:
                  typeof patch.monthlyReport === "boolean"
                    ? patch.monthlyReport
                    : x.monthlyReport,
              }
            : x
        )
      );
      setMessage("User report settings updated");
    } catch (err: any) {
      console.error("[users] update error", err);
      setError(err?.message || "Failed to update user");
    } finally {
      setSavingId(null);
    }
  };

  const handlePeriodChange = (userId: number, value: string) => {
    const v = value as ManualPeriodKey;
    setPeriodByUser((prev) => ({
      ...prev,
      [userId]: v,
    }));
  };

  const sendManualReport = async (u: TelegramUser) => {
    try {
      const periodKey = periodByUser[u.id] || "today";
      setSendingId(u.id);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/reports/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: u.chatId,
          periodKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Failed to send report");
      }

      setMessage(
        `Hisobot yuborildi: ${u.firstName ?? ""} ${
          u.lastName ?? ""
        } (${periodKey})`
      );
    } catch (err: any) {
      console.error("[users] manual report error", err);
      setError(err?.message || "Failed to send report");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50">
      <h1 className="mb-4 text-3xl font-bold">Telegram report users</h1>

      <p className="mb-2 text-sm text-slate-300">
        Bu sahifada botga yozgan foydalanuvchilar ro&apos;yxati.{" "}
        <br />
        Har bir foydalanuvchiga kundalik / haftalik / oylik avtomatik PDF
        hisobotlarini belgilash mumkin.
      </p>
      <p className="mb-4 text-xs text-slate-400">
        Shuningdek, har bir foydalanuvchiga qo&apos;lbola (manual){" "}
        <strong>Bugun / Kecha / Joriy oy</strong> kabi davrlar uchun hisobot
        yuborishingiz mumkin.
      </p>

      {message && (
        <div className="mb-3 rounded bg-emerald-900/40 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-300">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-300">
          No users yet. Ask people to send <code>/start</code> to your bot.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Chat ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Username
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Daily
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Weekly
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Monthly
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Manual report
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => {
                const fullName = [u.firstName, u.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim();

                const periodValue = periodByUser[u.id] || "today";

                return (
                  <tr key={u.id} className="hover:bg-slate-800/50">
                    <td className="px-3 py-2 text-xs text-slate-300">
                      {u.id}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {u.chatId}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-200">
                      {fullName || <span className="text-slate-500">-</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-200">
                      {u.username ? (
                        <span>@{u.username}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Daily */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={u.dailyReport}
                        disabled={savingId === u.id}
                        onChange={(e) =>
                          updateUser(u, { dailyReport: e.target.checked })
                        }
                      />
                    </td>

                    {/* Weekly */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={u.weeklyReport}
                        disabled={savingId === u.id}
                        onChange={(e) =>
                          updateUser(u, { weeklyReport: e.target.checked })
                        }
                      />
                    </td>

                    {/* Monthly */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={u.monthlyReport}
                        disabled={savingId === u.id}
                        onChange={(e) =>
                          updateUser(u, { monthlyReport: e.target.checked })
                        }
                      />
                    </td>

                    {/* Manual report */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <select
                          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                          value={periodValue}
                          onChange={(e) =>
                            handlePeriodChange(u.id, e.target.value)
                          }
                        >
                          {PERIOD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          disabled={sendingId === u.id}
                          onClick={() => sendManualReport(u)}
                        >
                          {sendingId === u.id ? "Sending..." : "Send report"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}