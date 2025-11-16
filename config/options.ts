// config/options.ts
// TODO: Replace ids & names with your real amoCRM data.

export type Option = {
  id: number;
  name: string;
};

export const STAGE_OPTIONS: Option[] = [
  // Example stages in your sotuv funnel:
  // { id: 111111, name: "Yangi lid" },
  // { id: 222222, name: "O‘ylab ko‘radi" },
  // { id: 333333, name: "Coachingga qiziqdi" },
  // { id: 444444, name: "Onlayn qiziqish bildirdi" },
  // { id: 555555, name: "Kelishuv" },
  // { id: 666666, name: "Muvaffaqiyatsiz" },
];

export const LOSS_REASON_OPTIONS: Option[] = [
  // Example loss reasons (E'tiroz sababi):
  // { id: 1, name: "Qimmat" },
  // { id: 2, name: "Vaqti yo‘q" },
  // { id: 3, name: "Raqobatchini tanladi" },
  // { id: 4, name: "Qiziqishi yo‘q" },
];
