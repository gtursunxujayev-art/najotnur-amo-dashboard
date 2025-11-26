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
}

interface ManagerStat {
  manager: string;
  totalPayment: number;
  totalDebt: number;
  courses: {
    courseType: string;
    totalPayment: number;
    totalDebt: number;
  }[];
}

interface CasosiyData {
  source: string;
  totalRecords: number;
  managerSummary: ManagerStat[];
  allRecords: CasosiyRecord[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU');
}

function PeriodButton({
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
      className={`px-4 py-1 rounded transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

export default function OfflinePage() {
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [data, setData] = useState<CasosiyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(periodKey: PeriodKey) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/casosiy?period=${periodKey}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load data');
      }

      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      console.error('Error loading casosiy data:', err);
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(period);
  }, [period]);

  const handlePeriodChange = (p: PeriodKey) => {
    if (p !== period) {
      setPeriod(p);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">O'quv Kurslar – Ofline</h1>
          <p className="text-sm text-slate-400">
            To'lovlar va qarzdorlik statistikasi
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-800 p-1 text-xs font-semibold gap-1">
          <PeriodButton
            label="Bugun"
            active={period === 'today'}
            onClick={() => handlePeriodChange('today')}
          />
          <PeriodButton
            label="Bu hafta"
            active={period === 'week'}
            onClick={() => handlePeriodChange('week')}
          />
          <PeriodButton
            label="Bu oy"
            active={period === 'month'}
            onClick={() => handlePeriodChange('month')}
          />
        </div>
      </header>

      <div className="space-y-6">
        {/* Manager Summary */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            Menejer Bo'yicha Statistika
          </h2>

          {loading ? (
            <div className="text-sm text-slate-400 animate-pulse">
              Ma'lumotlar yuklanmoqda...
            </div>
          ) : error ? (
            <div className="text-sm text-red-400">Xato: {error}</div>
          ) : !data || data.managerSummary.length === 0 ? (
            <div className="text-sm text-slate-500">
              Tanlangan davr uchun ma'lumot topilmadi.
            </div>
          ) : (
            <div className="space-y-4">
              {data.managerSummary.map((manager) => (
                <div
                  key={manager.manager}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {manager.manager}
                    </h3>
                    <div className="text-xs text-slate-400">
                      Jami: {formatCurrency(manager.totalPayment)} so'm
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs">
                    {manager.courses.map((course) => (
                      <div
                        key={course.courseType}
                        className="flex justify-between rounded bg-slate-700/50 px-3 py-2"
                      >
                        <span className="text-slate-300">{course.courseType}</span>
                        <div className="space-x-3">
                          <span className="text-green-400">
                            {formatCurrency(course.totalPayment)}
                          </span>
                          {course.totalDebt > 0 && (
                            <span className="text-red-400">
                              Qarz: {formatCurrency(course.totalDebt)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-700 pt-2 text-xs">
                    <span className="text-slate-400">Umumiy qarz</span>
                    <span className="font-semibold text-red-400">
                      {formatCurrency(manager.totalDebt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Records */}
        <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">
            So'nggi Yozuvlar
          </h2>

          {loading ? (
            <div className="text-sm text-slate-400 animate-pulse">
              Ma'lumotlar yuklanmoqda...
            </div>
          ) : error ? (
            <div className="text-sm text-red-400">Xato: {error}</div>
          ) : !data || data.allRecords.length === 0 ? (
            <div className="text-sm text-slate-500">
              Tanlangan davr uchun ma'lumot topilmadi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/60">
                    <th className="px-3 py-2">Sana</th>
                    <th className="px-3 py-2">Menejer</th>
                    <th className="px-3 py-2">Kurs Turi</th>
                    <th className="px-3 py-2">To'lov Turi</th>
                    <th className="px-3 py-2 text-right">To'lov Summa</th>
                    <th className="px-3 py-2 text-right">Qarz</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allRecords.slice(0, 100).map((record, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-800 hover:bg-slate-800/30 last:border-0"
                    >
                      <td className="px-3 py-2 text-slate-400">
                        {formatDate(record.date as any)}
                      </td>
                      <td className="px-3 py-2">{record.manager}</td>
                      <td className="px-3 py-2">{record.courseType}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {record.paymentType}
                      </td>
                      <td className="px-3 py-2 text-right text-green-400 font-semibold">
                        {formatCurrency(record.paymentSum)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {record.debtSum > 0 ? (
                          <span className="text-red-400 font-semibold">
                            {formatCurrency(record.debtSum)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
