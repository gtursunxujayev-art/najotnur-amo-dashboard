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

export default function UsersPage() {
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/report-users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateUser = async (
    u: TelegramUser,
    patch: Partial<TelegramUser>
  ) => {
    setSavingId(u.id);
    const res = await fetch("/api/report-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: u.chatId,
        dailyReport: patch.dailyReport ?? u.dailyReport,
        weeklyReport: patch.weeklyReport ?? u.weeklyReport,
        monthlyReport: patch.monthlyReport ?? u.monthlyReport,
      }),
    });
    const data = await res.json();
    setSavingId(null);
    if (res.ok) {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, ...data.user } : x))
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50">
      <h1 className="mb-4 text-3xl font-bold">Telegram report users</h1>
      <p className="mb-4 text-sm text-slate-300">
        This page shows Telegram users who wrote to the bot. Mark who should
        receive daily / weekly / monthly PDF reports.
      </p>

      {loading ? (
        <p className="text-sm text-slate-300">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-300">
          No users yet. Ask people to send <code>/start</code> to your bot.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                <th className="px-2 py-2 text-left">User</th>
                <th className="px-2 py-2 text-left">Chat ID</th>
                <th className="px-2 py-2">Daily</th>
                <th className="px-2 py-2">Weekly</th>
                <th className="px-2 py-2">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-800 last:border-none"
                >
                  <td className="px-2 py-1">
                    {u.firstName || u.username || "(no name)"}
                  </td>
                  <td className="px-2 py-1 text-xs text-slate-400">
                    {u.chatId}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={u.dailyReport}
                      disabled={savingId === u.id}
                      onChange={(e) =>
                        updateUser(u, { dailyReport: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={u.weeklyReport}
                      disabled={savingId === u.id}
                      onChange={(e) =>
                        updateUser(u, { weeklyReport: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={u.monthlyReport}
                      disabled={savingId === u.id}
                      onChange={(e) =>
                        updateUser(u, { monthlyReport: e.target.checked })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}