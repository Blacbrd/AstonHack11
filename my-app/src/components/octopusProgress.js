import { FEATURES } from "./OctopusSegments";

/* ===============================
   DEMO DAY OFFSET (RAGO MODE)
   =============================== */
const DAY_OFFSET_KEY = "octoDayOffset";

export function getDayOffset() {
  return Number(localStorage.getItem(DAY_OFFSET_KEY) || 0);
}

export function advanceDemoDay() {
  const next = getDayOffset() + 1;
  localStorage.setItem(DAY_OFFSET_KEY, String(next));
  return next;
}

/* ===============================
   DATE HELPERS
   =============================== */

export function getDayIndex(date = new Date()) {
  const offset = getDayOffset();
  const d = new Date(date);
  d.setDate(d.getDate() + offset);

  const day = d.getDay(); // Sun=0..Sat=6
  return (day + 6) % 7;   // Mon=0..Sun=6
}

export function getWeekId(date = new Date()) {
  const offset = getDayOffset();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + offset);

  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/* ===============================
   STATE HELPERS
   =============================== */

export function makeEmptyProgress() {
  const obj = {};
  for (const f of FEATURES) obj[f] = Array(7).fill(false);
  return obj;
}

export function loadOctoState() {
  const raw = localStorage.getItem("octoState");
  const currentWeek = getWeekId();

  if (!raw) {
    return { weekId: currentWeek, progress: makeEmptyProgress() };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed.weekId !== currentWeek) {
      return { weekId: currentWeek, progress: makeEmptyProgress() };
    }
    return parsed;
  } catch {
    return { weekId: currentWeek, progress: makeEmptyProgress() };
  }
}

export function saveOctoState(state) {
  localStorage.setItem("octoState", JSON.stringify(state));
}

/* ===============================
   CORE LOGIC
   =============================== */

export function logToday(state, featureKey) {
  const currentWeek = getWeekId();
  let next = state;

  if (state.weekId !== currentWeek) {
    next = { weekId: currentWeek, progress: makeEmptyProgress() };
  }

  const i = getDayIndex();

  if (next.progress[featureKey][i]) {
    return { nextState: next, didLog: false };
  }

  const nextProgress = { ...next.progress };
  nextProgress[featureKey] = [...nextProgress[featureKey]];
  nextProgress[featureKey][i] = true;

  return {
    nextState: { ...next, progress: nextProgress },
    didLog: true,
  };
}

/* ===============================
   ONE-LINER FOR PAGES
   =============================== */

export function logTodayAndSave(featureKey) {
  const state = loadOctoState();
  const { nextState, didLog } = logToday(state, featureKey);
  if (didLog) saveOctoState(nextState);
}
