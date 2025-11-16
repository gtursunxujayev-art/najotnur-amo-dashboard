// app/admin/page.tsx

export default function AdminInfoPage() {
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard Admin Info</h1>

      <section className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
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
      </section>

      <section className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Qo‘ng‘iroqlar (Google Sheets)</h2>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          <li>
            Env o‘zgaruvchilar:{" "}
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
      </section>

      <section className="space-y-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Qanday o‘zgartirish kerak?</h2>
        <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
          <li>
            Status ID larni amoCRM pipelinedan ko‘chirib,{" "}
            <code>config/dashboardConfig.ts</code> ga yozasiz.
          </li>
          <li>
            Google Sheetsdagi ustunlarni shu formatga olib kelasiz /
            moslashtirasiz.
          </li>
          <li>
            O‘zgarishlardan keyin GitHubga <strong>commit + push</strong>, Vercel
            avtomatik redeploy qiladi.
          </li>
        </ol>
      </section>
    </main>
  );
}
