// "YYYY-MM-DD" in the device's own time zone. toISOString() uses UTC, which
// gives yesterday's date for anything written between midnight and 2am in France.
export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
