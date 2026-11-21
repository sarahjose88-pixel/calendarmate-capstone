// CalendarMate – Find Overlaps (n8n Code node, "Run Once for All Items")
// Deterministic conflict detection: the model only judges conflicts, it never has to find them.
const TZ = 'Asia/Kolkata';
const fmtDay = d => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
const fmtTime = d => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(d);

const events = $input.all()
  .map(i => i.json)
  .filter(e => e && e.start && e.start.dateTime && e.end && e.end.dateTime && e.status !== 'cancelled')
  .map(e => ({
    title: e.summary || '(no title)',
    start: new Date(e.start.dateTime),
    end: new Date(e.end.dateTime),
    // attendees from the guest list, or from an "Attendees: …" line in the description
    attendees: (e.attendees || []).map(a => a.email).join(', ')
      || (((e.description || '').match(/Attendees:\s*(.+)/) || [])[1] || '').trim()
      || 'no attendees',
  }))
  .sort((a, b) => a.start - b.start);

const line = e => `${fmtDay(e.start)} ${fmtTime(e.start)}–${fmtTime(e.end)} · ${e.title} · ${e.attendees}`;

const overlaps = [];
for (let i = 0; i < events.length; i++) {
  for (let j = i + 1; j < events.length && events[j].start < events[i].end; j++) {
    const a = events[i], b = events[j];
    const from = new Date(Math.max(a.start, b.start));
    const to = new Date(Math.min(a.end, b.end));
    overlaps.push(`${fmtDay(from)}: "${a.title}" (${fmtTime(a.start)}–${fmtTime(a.end)}) overlaps "${b.title}" (${fmtTime(b.start)}–${fmtTime(b.end)}) from ${fmtTime(from)} to ${fmtTime(to)}`);
  }
}

return [{ json: {
  eventsText: events.length ? events.map(line).join('\n') : 'No events in this period.',
  overlapsText: overlaps.length ? overlaps.join('\n') : 'No overlapping meetings found.',
  eventCount: events.length,
  overlapCount: overlaps.length,
} }];
