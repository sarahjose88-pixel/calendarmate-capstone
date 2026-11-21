// CalendarMate – Date Resolver (n8n Code node, "Run Once for All Items")
// Builds an exact date table in Asia/Kolkata so agents never do calendar arithmetic.
const TZ = 'Asia/Kolkata';
const OFFSET = '+05:30';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const input = $input.first().json;
const now = new Date();

// Today's calendar date in IST
const parts = Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(now).map(p => [p.type, p.value])
);
const todayUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day);
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const dayMs = 86400000;
const dow = new Date(todayUtc).getUTCDay();          // 0 = Sunday
const mondayThisWeek = todayUtc - ((dow + 6) % 7) * dayMs;

const label = (ms, offsetDays) => {
  const d = new Date(ms);
  let tag = '';
  if (offsetDays === 0) tag = ' (TODAY)';
  else if (offsetDays === 1) tag = ' (TOMORROW)';
  else if (offsetDays === -1) tag = ' (YESTERDAY)';
  return `${DAYS[d.getUTCDay()]} ${iso(ms)}${tag}`;
};

const lines = [];
for (let i = 0; i < 21; i++) {
  const ms = mondayThisWeek + i * dayMs;
  const week = i < 7 ? 'this week' : i < 14 ? 'next week' : 'week after next';
  lines.push(`- ${label(ms, Math.round((ms - todayUtc) / dayMs))} [${week}]`);
}

// Bare weekday names resolve to the next upcoming date (today counts if it is that day).
const upcoming = DAYS.map((name, d) => {
  const ahead = (d - dow + 7) % 7;
  return `${name} = ${iso(todayUtc + ahead * dayMs)}`;
}).join(', ');

const range = (startMs, days) =>
  `${iso(startMs)}T00:00:00${OFFSET} to ${iso(startMs + (days - 1) * dayMs)}T23:59:59${OFFSET}`;

const dateContext = [
  `Current date and time: ${DAYS[dow]} ${iso(todayUtc)}, ${parts.hour}:${parts.minute} IST (Asia/Kolkata, UTC${OFFSET}).`,
  `Weeks run Monday to Sunday.`,
  `"This week" = ${range(mondayThisWeek, 7)}.`,
  `"Next week" = ${range(mondayThisWeek + 7 * dayMs, 7)}.`,
  `"Next <weekday>" (e.g. next Thursday) = that weekday in NEXT week. "This <weekday>" = that weekday in this week.`,
  `A weekday on its own ("Saturday", "on Friday") = the NEXT upcoming one: ${upcoming}. Never pick a past day unless the user says "last" or "yesterday".`,
  `Always pass time ranges to tools as ISO 8601 with the ${OFFSET} offset, e.g. ${iso(todayUtc)}T00:00:00${OFFSET}.`,
  `Day lookup table (use it; never calculate dates yourself):`,
  ...lines,
].join('\n');

return [{ json: {
  ...input,
  dateContext,
  todayIso: iso(todayUtc),
  // fixed window used by the Conflict Resolver branch: Monday this week → Sunday next week
  windowStart: `${iso(mondayThisWeek)}T00:00:00${OFFSET}`,
  windowEnd: `${iso(mondayThisWeek + 13 * dayMs)}T23:59:59${OFFSET}`,
} }];
