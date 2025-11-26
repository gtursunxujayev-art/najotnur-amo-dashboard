'use client';

import { useState, useEffect } from 'react';

type PeriodKey = 'today' | 'week' | 'month';

interface CasosiyRecord {
  date: Date;
  manager: string;
  courseType: string;
  paymentType: string;
  paymentSum: number;
  debtSum: number;
  kelishuv: number;
}

interface CasosiyData {
  source: string;
  totalRecords: number;
  courseTypes: string[];
  selectedCourseType: string | null;
  kpi: {
    tushum: number;
    qarzdorlik: number;
    kelishuv: number;
  };
  tarifCounts: Record<string, number>;
  allRecords: CasosiyRecord[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function KPICard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg border ${color} p-4`}>
      <p className="text-xs font-semibold text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-100">
        {formatCurrency(value)}
      </p>
      <p className="text-xs text-slate-500 mt-1">so'm</p>
    </div>
  );
}

export default function OfflinePage() {
  const [courseType, setCourseType] = useState<string | null>(null);
  const [data, setData] = useState<CasosiyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(selectedCourse: string | null) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCourse) {
        params.set('courseType', selectedCourse);
      }
      
      const res = await fetch(`/api/casosiy?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load data');
      }

      const json = await res.json();
      setData(json.data);
      
      // Set first course type as default if not already selected
      if (!selectedCourse && json.data.courseTypes.length > 0) {
        setCourseType(json.data.courseTypes[0]);
      }
    } catch (err: any) {
      console.error('Error loading casosiy data:', err);
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(courseType);
  }, [courseType]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">O'quv Kurslar – Ofline</h1>
        <p className="text-sm text-slate-400">
          To'lovlar, qarzdorlik va kelishuv statistikasi
        </p>
      </header>

      <div className="space-y-6">
        {/* Course Type Selector */}
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 max-w-sm">
          <label className="block text-xs font-semibold text-slate-400 mb-2">
            KURS TURI
          </label>
          {loading ? (
            <div className="text-xs text-slate-500 animate-pulse">Yuklanmoqda...</div>
          ) : !data || data.courseTypes.length === 0 ? (
            <div className="text-xs text-slate-500">Kurs topilmadi</div>
          ) : (
            <select
              value={courseType || ''}
              onChange={(e) => setCourseType(e.target.value || null)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded text-slate-100 hover:border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              {data.courseTypes.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* KPI Cards */}
        {!loading && data && (
          <div className="grid gap-4 md:grid-cols-3">
            <KPICard
              title="TUSHUM (To'lov summa)"
              value={data.kpi.tushum}
              color="border-slate-700 bg-slate-900/50"
            />
            <KPICard
              title="QARZDORLIK (Qarz summa)"
              value={data.kpi.qarzdorlik}
              color="border-red-900/30 bg-red-950/20"
            />
            <KPICard
              title="KELISHUV (Kelishuvga olingan)"
              value={data.kpi.kelishuv}
              color="border-green-900/30 bg-green-950/20"
            />
          </div>
        )}

        {/* Tarif Type Counts */}
        {!loading && data && Object.keys(data.tarifCounts).length > 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              TARIF TURI BO'YICHA HISOB
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(data.tarifCounts).map(([tarif, count]) => (
                <div
                  key={tarif}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-center"
                >
                  <p className="text-xs font-semibold text-slate-300">{tarif}</p>
                  <p className="text-2xl font-bold text-blue-400">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-4 text-sm text-red-400">
            Xato: {error}
          </div>
        )}

        {/* Recent Records Table */}
        {!loading && data && data.allRecords.length > 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">
              SO'NGGI YOZUVLAR
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/60">
                    <th className="px-3 py-2">Sana</th>
                    <th className="px-3 py-2">Menejer</th>
                    <th className="px-3 py-2">Tarif Turi</th>
                    <th className="px-3 py-2 text-right">Tushum</th>
                    <th className="px-3 py-2 text-right">Qarz</th>
                    <th className="px-3 py-2 text-right">Kelishuv</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allRecords.slice(0, 50).map((record, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-800 hover:bg-slate-800/30 last:border-0"
                    >
                      <td className="px-3 py-2 text-slate-400">
                        {new Date(record.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-3 py-2">{record.manager}</td>
                      <td className="px-3 py-2 text-slate-400">{record.paymentType}</td>
                      <td className="px-3 py-2 text-right text-green-400 font-semibold">
                        {formatCurrency(record.paymentSum)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {record.debtSum > 0 ? (
                          <span className="text-red-400 font-semibold">
                            {formatCurrency(record.debtSum)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatCurrency(record.kelishuv)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && data.allRecords.length === 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-center text-sm text-slate-500">
            Tanlangan davr uchun "{data.selectedCourseType || 'barcha'}" ma'lumot topilmadi.
          </div>
        )}
      </div>
    </main>
  );
}
