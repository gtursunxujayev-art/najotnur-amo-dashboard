"use client";

import { useState } from "react";

export default function AdminPage() {
  const [tab, setTab] = useState<"info" | "constructor" | "tushum">("info");

  // Example placeholders for your existing constructor state
  const [constructorData, setConstructorData] = useState<any>({});
  const [tushum, setTushum] = useState({
    link: "",
    managerColumn: "",
    dateColumn: "",
    paymentTypeColumn: "",
    incomeTypeColumn: "",
    amountColumn: "",
  });

  async function saveTushum() {
    try {
      const res = await fetch("/api/admin/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "tushum",
          data: tushum,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error);
      alert("✅ Tushum konfiguratsiyasi saqlandi!");
    } catch (err: any) {
      alert("❌ Xatolik: " + err.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
      <h1 className="mb-6 text-3xl font-bold">Admin panel</h1>

      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setTab("info")}
          className={`rounded px-3 py-1 ${
            tab === "info" ? "bg-emerald-600" : "bg-slate-800"
          }`}
        >
          Info
        </button>
        <button
          onClick={() => setTab("constructor")}
          className={`rounded px-3 py-1 ${
            tab === "constructor" ? "bg-emerald-600" : "bg-slate-800"
          }`}
        >
          Constructor
        </button>
        <button
          onClick={() => setTab("tushum")}
          className={`rounded px-3 py-1 ${
            tab === "tushum" ? "bg-emerald-600" : "bg-slate-800"
          }`}
        >
          Tushum
        </button>
      </div>

      {/* === INFO TAB === */}
      {tab === "info" && (
        <div className="rounded-xl bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-slate-100">
            ℹ️ Umumiy ma'lumot
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Bu bo‘limda siz amoCRM va Google Sheets integratsiyalarini
            sozlashingiz mumkin.
          </p>
        </div>
      )}

      {/* === CONSTRUCTOR TAB === */}
      {tab === "constructor" && (
        <div className="rounded-xl bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-slate-100">
            ⚙️ Status Constructor
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Bu bo‘limda CRM’dagi statuslar, pipeline va boshqa moslamalarni
            belgilang.
          </p>
          {/* Your existing constructor UI goes here */}
        </div>
      )}

      {/* === TUSHUM TAB === */}
      {tab === "tushum" && (
        <div className="space-y-4 rounded-xl bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold text-slate-100">
            💵 Tushum (Sheets integratsiya)
          </h2>
          <p className="text-sm text-slate-400">
            Google Sheets faylini ulangan holda tushum ma’lumotlarini
            avtomatik tarzda Dashboard’ga kiritish mumkin.
          </p>

          <div className="space-y-3">
            {/* Google Sheet Link */}
            <div>
              <label className="block text-sm text-slate-300">
                Google Sheets havolasi
              </label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                value={tushum.link}
                onChange={(e) =>
                  setTushum({ ...tushum, link: e.target.value })
                }
              />
            </div>

            {/* Manager & Date columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">
                  Menejer ustuni (masalan Baza!A)
                </label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                  value={tushum.managerColumn}
                  onChange={(e) =>
                    setTushum({
                      ...tushum,
                      managerColumn: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">
                  Sana ustuni (masalan Baza!B)
                </label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                  value={tushum.dateColumn}
                  onChange={(e) =>
                    setTushum({
                      ...tushum,
                      dateColumn: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Payment type & Income type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">
                  To‘lov turi (first / middle / last) ustuni
                </label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                  value={tushum.paymentTypeColumn}
                  onChange={(e) =>
                    setTushum({
                      ...tushum,
                      paymentTypeColumn: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">
                  Tushum turi (online / offline) ustuni
                </label>
                <input
                  type="text"
                  className="w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                  value={tushum.incomeTypeColumn}
                  onChange={(e) =>
                    setTushum({
                      ...tushum,
                      incomeTypeColumn: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Amount column */}
            <div>
              <label className="block text-sm text-slate-300">
                Summasi ustuni (masalan Baza!E)
              </label>
              <input
                type="text"
                className="w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                value={tushum.amountColumn}
                onChange={(e) =>
                  setTushum({
                    ...tushum,
                    amountColumn: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={saveTushum}
              className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              Saqlash
            </button>
          </div>
        </div>
      )}
    </main>
  );
}