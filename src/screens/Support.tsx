import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Empty, Pill } from '../components/ui';
import { api } from '../lib/api';

/**
 * PA-08 — support inbox.
 *
 * "Every ticket carries the school's live state, so you don't start by asking
 * questions." That is the entire screen. The yellow block is pulled from the
 * database the moment the ticket opens, and it is above the reply box on
 * purpose: the answer is usually already in it.
 */
export function Support(): React.ReactElement {
  const { id } = useParams();
  const { data } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.tickets(),
    refetchInterval: 60_000,
  });

  const tickets = data?.tickets ?? [];
  const urgent = tickets.filter((t) => t.priority === 'urgent').length;

  return (
    <div className="grid h-full grid-cols-[300px_1fr]">
      <div className="overflow-y-auto border-r border-line bg-white">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h3 className="font-head text-[16px] font-bold">Support</h3>
          {urgent > 0 ? <Pill tone="bad">{urgent} urgent</Pill> : null}
        </div>
        {tickets.length === 0 ? (
          <Empty>Nothing open.</Empty>
        ) : (
          tickets.map((t) => (
            <Link
              key={t.id}
              to={`/support/${t.id}`}
              className={`block border-b border-line px-4 py-3 hover:bg-paper ${
                id === t.id ? 'bg-paper shadow-[inset_3px_0_0_var(--color-alert)]' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <b className="truncate text-[13px]">{t.subject}</b>
                {t.priority === 'urgent' ? <Pill tone="bad">Urgent</Pill> : null}
              </div>
              <div className="mt-1 text-[11.5px] text-slate">
                {t.school_name} · {formatAge(t.minutes_open)}
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="overflow-y-auto">{id ? <Ticket id={id} /> : <Empty>Pick a ticket.</Empty>}</div>
    </div>
  );
}

function Ticket({ id }: { id: string }): React.ReactElement {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['ticket', id], queryFn: () => api.ticket(id) });

  const reply = useMutation({
    mutationFn: () => api.reply(id, body),
    onSuccess: () => {
      setBody('');
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  const update = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.updateTicket(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  if (isLoading || !data) return <Empty>Loading…</Empty>;
  const t = data.ticket as Record<string, string | number | null>;
  const child = data.context.child;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h4 className="font-head text-[19px] font-bold">{String(t['subject'])}</h4>
          <div className="text-[12px] text-slate">
            {String(t['school_name'])} · raised by {String(t['raised_by'] ?? 'the school')} · ticket{' '}
            <span className="font-mono">#{String(t['number'])}</span>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => update.mutate({ assignToMe: true })}>Assign to me</Button>
          <Button onClick={() => update.mutate({ status: 'known_issue' })}>Known issue</Button>
          <Button kind="primary" onClick={() => update.mutate({ status: 'closed' })}>
            Close
          </Button>
        </div>
      </div>

      <Card title="What the school said">
        <div className="p-4 text-[13.5px] leading-relaxed">{String(t['body'])}</div>
      </Card>

      <div className="overflow-hidden rounded-card border border-bus bg-white">
        <div className="flex items-center gap-3 border-b border-[#F0D48A] bg-[#FFF8E6] px-4 py-2.5">
          <h4 className="font-head text-[15px] font-bold">What the system already knows</h4>
          <span className="text-[11.5px] text-slate">Pulled when the ticket opened</span>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            {child ? (
              <>
                <Stat label="Child" value={`${String(child['name'])} · ${String(child['class'] ?? '—')}`} />
                <Stat label="Route" value={String(child['route_name'] ?? '—')} />
                <Stat
                  label="Assigned stop"
                  value={
                    child['stop_name']
                      ? `${String(child['stop_name'])} (stop ${String(child['stop_seq'])})`
                      : 'none'
                  }
                />
                <Stat
                  label="Parent app version"
                  value={String(child['parent_app_version'] ?? 'never opened')}
                  bad={!child['parent_app_version']}
                />
                <Stat
                  label="Push permission"
                  value={String(child['push_permission'] ?? 'unknown')}
                  bad={child['push_permission'] === 'denied'}
                />
                <Stat label="Boarding today" value={String(child['boarding_today'] ?? 'nothing yet')} />
              </>
            ) : (
              <p className="text-[12.5px] text-slate">
                This ticket is not about one child, so there is nothing to pull.
              </p>
            )}
          </div>
          <div>
            {(data.context.buses ?? []).length === 0 ? (
              <p className="text-[12.5px] text-slate">No trip running right now.</p>
            ) : (
              (data.context.buses ?? []).map((b, i) => (
                <Stat
                  key={i}
                  label={`${b.plate} · ${b.route_name}`}
                  value={
                    b.seconds_since_fix === null
                      ? 'no position received'
                      : `last fix ${b.seconds_since_fix}s ago`
                  }
                  bad={b.seconds_since_fix === null || b.seconds_since_fix > 300}
                />
              ))
            )}
            <Stat
              label="Similar tickets this month"
              value={String(data.context.similarThisMonth ?? 0)}
              bad={(data.context.similarThisMonth ?? 0) > 3}
            />
          </div>
        </div>
        {(data.context.similarThisMonth ?? 0) > 3 ? (
          <p className="border-t border-line px-4 py-2.5 text-[12px] leading-relaxed text-slate">
            {data.context.similarThisMonth} tickets with this subject this month. That is a release
            problem, not a support problem — mark it a known issue and fix the cause.
          </p>
        ) : null}
      </div>

      <Card title="Replies">
        {data.replies.length === 0 ? (
          <Empty>No reply yet.</Empty>
        ) : (
          data.replies.map((r, i) => (
            <div key={i} className="border-b border-line px-4 py-3 last:border-0">
              <div className="text-[11.5px] text-slate">
                {r.author} · {new Date(r.at).toLocaleString('en-IN')}
              </div>
              <div className="text-[13.5px]">{r.body}</div>
            </div>
          ))
        )}
        <div className="border-t border-line p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Reply to the school…"
            className="w-full rounded-btn border border-line px-3 py-2 text-[13.5px]"
          />
          <div className="mt-2">
            <Button
              kind="primary"
              disabled={!body.trim() || reply.isPending}
              onClick={() => reply.mutate()}
            >
              {reply.isPending ? 'Sending…' : 'Send reply'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  bad,
}: {
  label: string;
  value: string;
  bad?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-2 text-[12.5px] last:border-0">
      <span className="text-slate">{label}</span>
      <span className={`font-mono font-semibold ${bad ? 'text-alert' : ''}`}>{value}</span>
    </div>
  );
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}
