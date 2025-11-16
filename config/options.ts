// config/options.ts
// !!! IMPORTANT !!!
// Replace the fake ids (1001, 1002, ...) with REAL status_ids from amoCRM
// (Settings → Pipelines → open Sotuv pipeline → copy each stage id).

export type Option = {
  id: number;
  name: string;
};

export const STAGE_OPTIONS: Option[] = [
  { id: 1001, name: "YANGI LID" },
  { id: 1002, name: "ISHGA OLINDI" },
  { id: 1003, name: "KO'TARMADI" },
  { id: 1004, name: "2-MARTA KO'TARMADI" },
  { id: 1005, name: "O'YLAB KO'RADI" },
  { id: 1006, name: "ONLINE QIZIQISH BILDIRDI" },
  { id: 1007, name: "COUCHING QIZIQISH BILDIRDI" },
  { id: 1008, name: "BIRINCHI DARSGA CHAQIRILDI" },
  { id: 1009, name: "DOJIM" },
  { id: 1010, name: "TO'LOVGA ROZI" },
  { id: 1011, name: "QISMAN TO'LOV QILDI" },
  { id: 1012, name: "SOTIB OLDI" },
  { id: 1013, name: "MUVAFFAQIYATSIZ" },
];

// Loss reasons (E'tiroz sababi) – fill when you’re ready.
// Same idea: replace ids with real loss_reason_id from amoCRM.
export const LOSS_REASON_OPTIONS: Option[] = [
  // example:
  // { id: 1, name: "Qimmat" },
  // { id: 2, name: "Vaqti yo'q" },
  // { id: 3, name: "Raqobatchini tanladi" },
];
