// app/users/page.tsx
"use client";

import React, { useEffect, useState } from "react";

type TelegramUser = {
  id: number;
  chatId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  dailyReport: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  leadNotifications: boolean;
  notifyManagers: string[];
  notifyStartTime: string | null;
  notifyEndTime: string | null;
};

const MANAGERS = [
  "Madina",
  "Zilola",
  "Sabrina",
  "Oyshaxon",
  "Marg'uba",
  "Mumtoza",
  "Matluba",
  "Mohinur",
  "sabina",
  "Gulchehra",
  "Orzugul",
];

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
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [customTimeInputs, setCustomTimeInputs] = useState<Record<number, { start: string; end: string }>>({});

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

  const updateNotificationSettings = async (
    userId: number,
    patch: {
      leadNotifications?: boolean;
      notifyManagers?: string[];
      notifyStartTime?: string | null;
      notifyEndTime?: string | null;
    }
  ) => {
    try {
      setSavingId(userId);
      setError(null);
      setMessage(null);

      const res = await fetch(`/api/users/${userId}/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Update failed");
      }

      setUsers((prev) =>
        prev.map((x) =>
          x.id === userId
            ? {
                ...x,
                leadNotifications: data.data.leadNotifications ?? x.leadNotifications,
                notifyManagers: data.data.notifyManagers ?? x.notifyManagers,
                notifyStartTime: data.data.notifyStartTime,
                notifyEndTime: data.data.notifyEndTime,
              }
            : x
        )
      );
      setMessage("Bildirishnoma sozlamalari yangilandi");
    } catch (err: any) {
      console.error("[users] notification update error", err);
      setError(err?.message || "Failed to update notification settings");
    } finally {
      setSavingId(null);
    }
  };

  const toggleManager = (user: TelegramUser, manager: string) => {
    const currentManagers = user.notifyManagers || [];
    let newManagers: string[];
    
    if (currentManagers.includes(manager)) {
      newManagers = currentManagers.filter((m) => m !== manager);
    } else {
      newManagers = [...currentManagers, manager];
    }
    
    updateNotificationSettings(user.id, { notifyManagers: newManagers });
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
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Lid xabarlari
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
                  <React.Fragment key={u.id}>
                  <tr className="hover:bg-slate-800/50">
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

                    {/* Lead Notifications */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={u.leadNotifications}
                          disabled={savingId === u.id}
                          onChange={(e) =>
                            updateNotificationSettings(u.id, {
                              leadNotifications: e.target.checked,
                            })
                          }
                        />
                        <button
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                          onClick={() =>
                            setExpandedUserId(
                              expandedUserId === u.id ? null : u.id
                            )
                          }
                        >
                          {expandedUserId === u.id ? "Yopish" : "Sozlamalar"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded notification settings */}
                  {expandedUserId === u.id && (
                    <tr className="bg-slate-800/70">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="space-y-4">
                          <div>
                            <p className="mb-2 text-xs font-semibold text-slate-300">
                              Qaysi menejerlar lidlarini yuborish:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className={`rounded px-2 py-1 text-xs ${
                                  (u.notifyManagers || []).length === 0
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                                onClick={() =>
                                  updateNotificationSettings(u.id, {
                                    notifyManagers: [],
                                  })
                                }
                              >
                                Barcha menejerlar
                              </button>
                              {MANAGERS.map((manager) => (
                                <button
                                  key={manager}
                                  className={`rounded px-2 py-1 text-xs ${
                                    (u.notifyManagers || []).includes(manager)
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-700 text-slate-300"
                                  }`}
                                  onClick={() => toggleManager(u, manager)}
                                >
                                  {manager}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-semibold text-slate-300">
                              Yuborish vaqti (GMT+5):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className={`rounded px-2 py-1 text-xs ${
                                  !u.notifyStartTime && !u.notifyEndTime
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                                onClick={() =>
                                  updateNotificationSettings(u.id, {
                                    notifyStartTime: null,
                                    notifyEndTime: null,
                                  })
                                }
                              >
                                24/7 (to'xtovsiz)
                              </button>
                              <button
                                className={`rounded px-2 py-1 text-xs ${
                                  u.notifyStartTime === "09:00" &&
                                  u.notifyEndTime === "18:00"
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                                onClick={() =>
                                  updateNotificationSettings(u.id, {
                                    notifyStartTime: "09:00",
                                    notifyEndTime: "18:00",
                                  })
                                }
                              >
                                09:00 - 18:00
                              </button>
                              <button
                                className={`rounded px-2 py-1 text-xs ${
                                  u.notifyStartTime === "08:00" &&
                                  u.notifyEndTime === "20:00"
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                                onClick={() =>
                                  updateNotificationSettings(u.id, {
                                    notifyStartTime: "08:00",
                                    notifyEndTime: "20:00",
                                  })
                                }
                              >
                                08:00 - 20:00
                              </button>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="time"
                                className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                                value={customTimeInputs[u.id]?.start || u.notifyStartTime || "09:00"}
                                onChange={(e) =>
                                  setCustomTimeInputs((prev) => ({
                                    ...prev,
                                    [u.id]: { ...prev[u.id], start: e.target.value, end: prev[u.id]?.end || u.notifyEndTime || "18:00" },
                                  }))
                                }
                              />
                              <span className="text-xs text-slate-400">—</span>
                              <input
                                type="time"
                                className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                                value={customTimeInputs[u.id]?.end || u.notifyEndTime || "18:00"}
                                onChange={(e) =>
                                  setCustomTimeInputs((prev) => ({
                                    ...prev,
                                    [u.id]: { ...prev[u.id], end: e.target.value, start: prev[u.id]?.start || u.notifyStartTime || "09:00" },
                                  }))
                                }
                              />
                              <button
                                className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500"
                                onClick={() => {
                                  const times = customTimeInputs[u.id];
                                  if (times?.start && times?.end) {
                                    updateNotificationSettings(u.id, {
                                      notifyStartTime: times.start,
                                      notifyEndTime: times.end,
                                    });
                                  }
                                }}
                              >
                                Saqlash
                              </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                              Ish vaqtidan tashqarida kelgan lidlar 9:05 da
                              yuboriladi.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}