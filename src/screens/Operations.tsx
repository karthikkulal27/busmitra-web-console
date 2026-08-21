import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Empty, Kpi, Pill } from '../components/ui';
import { api, rupees } from '../lib/api';
import type { NeedsYouItem } from '../lib/api';

/**
 * PA-02 — operations overview. The 7:15 AM screen.
 *
 * The prototype's note is the whole design: "not a dashboard, but a queue of
 * things needing a human. At 21 schools you cannot browse — you can only work a
 * list."
 *
 * So the counters across the top are for glancing at, and the list below them is
 * the screen. Nothing on it is decorative: every row is a real record, and the
 * order is how loudly it will ring — a bus that has gone quiet with children
 * aboard first, money last.
 */
export function Operations(): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.overview(),
    // The morning window is the only time this screen matters, and during it
    // things change by the minute.
    refetchInterval: 30_000,
  });

  const c = data?.counts;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Buses reporting"
          value={
            <>
              {c?.busesReporting ?? '—'}{' '}
              <small className="text-[15px] text-[#8FA0B6]">/ {c?.busesTotal ?? '—'}</small>
            </>
          }
          detail={
            c ? `${c.busesTotal - c.busesReporting} idle or off duty` : undefined
          }
          tone="hot"
        />
        <Kpi
          label="Schools live now"
          value={
            <>
              {c?.schoolsLive ?? '—'}{' '}
              <small className="text-[15px] text-slate">/ {c?.schoolsTotal ?? '—'}</small>
            </>
          }
          detail="Running a trip right now"
        />
        <Kpi label="Children tracked" value={c?.children ?? '—'} detail="Active on a route" />
        <Kpi
          label="Needs you"
          value={data?.needsYou.length ?? '—'}
          detail={summarise(data?.needsYou ?? [])}
          tone={(data?.needsYou.length ?? 0) > 0 ? 'alert' : undefined}
        />
        <Kpi
          label="MRR"
          value={c ? rupees(c.mrrPaise, { lakh: true }) : '—'}
          detail="Billed schools only"
        />
      </div>

      <Card title="Needs you today" hint="Sorted by how loudly it will ring">
        {isLoading ? (
          <Empty>Loading…</Empty>
        ) : (data?.needsYou.length ?? 0) === 0 ? (
          <Empty>Nothing needs you. Buses are reporting and nobody is overdue.</Empty>
        ) : (
          <div>
            {data!.needsYou.map((item, i) => (
              <Row key={i} item={item} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ item }: { item: NeedsYouItem }): React.ReactElement {
  const tone = item.severity === 'critical' ? 'bad' : item.severity === 'warn' ? 'warn' : 'info';
  const mark = { quiet_bus: '!', ticket: '?', overdue_invoice: '₹', trial_ending: '◔' }[item.kind] ?? '•';

  const body = (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-paper">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-btn text-[13px] font-bold ${
          tone === 'bad'
            ? 'bg-[#FBE4E1] text-[#A62A1B]'
            : tone === 'warn'
              ? 'bg-[#FFF2D6] text-[#8A5B00]'
              : 'bg-[#E7EDF6] text-[#2C4B78]'
        }`}
      >
        {mark}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-semibold">{item.title}</div>
        <div className="truncate text-[12px] text-slate">{item.detail}</div>
      </div>
      <div className="ml-auto shrink-0">
        <Pill tone={tone}>{label(item.kind)}</Pill>
      </div>
    </div>
  );

  if (item.ticketId) return <Link to={`/support/${item.ticketId}`}>{body}</Link>;
  if (item.schoolId) return <Link to={`/schools/${item.schoolId}`}>{body}</Link>;
  return body;
}

function label(kind: string): string {
  return (
    {
      quiet_bus: 'Not reporting',
      ticket: 'Ticket',
      overdue_invoice: 'Overdue',
      trial_ending: 'Trial',
    }[kind] ?? kind
  );
}

/** "3 device, 2 billing, 1 ticket" — the prototype's own phrasing. */
function summarise(items: NeedsYouItem[]): string {
  if (items.length === 0) return 'All clear';
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  const names: Record<string, string> = {
    quiet_bus: 'not reporting',
    ticket: 'ticket',
    overdue_invoice: 'billing',
    trial_ending: 'trial',
  };
  return [...counts].map(([k, n]) => `${n} ${names[k] ?? k}`).join(', ');
}
