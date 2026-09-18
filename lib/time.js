// All day boundaries here are CST — a fixed UTC-6 offset, not daylight-
// saving-aware. If you want it to shift to CDT in summer, this is the
// file to change.

export const CST_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cstParts(utcMs) {
  const shifted = new Date(utcMs - CST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    day: shifted.getUTCDay(), // 0 = Sunday
  };
}

function cstMidnightUtcMs(year, month, date) {
  return Date.UTC(year, month, date) + CST_OFFSET_MS;
}

export function weekStartUtcMs(utcMs) {
  const p = cstParts(utcMs);
  const todayMidnight = cstMidnightUtcMs(p.year, p.month, p.date);
  return todayMidnight - p.day * DAY_MS;
}

export function weekKeyFromStart(startUtcMs) {
  const p = cstParts(startUtcMs);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.date).padStart(2, "0")}`;
}

export function currentWeekKey() {
  return weekKeyFromStart(weekStartUtcMs(Date.now()));
}

/** Splits [startMs, endMs) into per-CST-day segments, each tagged with its week key. */
export function splitByCstDay(startMs, endMs) {
  const segments = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const p = cstParts(cursor);
    const dayMidnight = cstMidnightUtcMs(p.year, p.month, p.date);
    const nextMidnight = dayMidnight + DAY_MS;
    const segmentEnd = Math.min(endMs, nextMidnight);
    const hours = (segmentEnd - cursor) / (60 * 60 * 1000);
    segments.push({
      weekKey: weekKeyFromStart(weekStartUtcMs(cursor)),
      day: DAY_NAMES[p.day],
      hours,
    });
    cursor = segmentEnd;
  }
  return segments;
}

export function emptyWeek() {
  return Object.fromEntries(DAY_NAMES.map((d) => [d, 0]));
}