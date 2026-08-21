import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Pill, Th } from '../components/ui';
import { api } from '../lib/api';

/**
 * PA-10 — team and audit log.
 *
 * "You're handling children's live locations. Assume you will one day have to
 * prove who looked at what."
 *
 * Two consequences show up on this screen. The log records **reads**, not just
 * writes — the question that will actually be asked is "who looked at my
 * child's location", and a log of mutations cannot answer it. And the log
 * cannot be edited: the table refuses UPDATE and DELETE at the database, the
 * same way `boardings` does.
 */
export function Team(): React.ReactElement {
  const { data } = useQuery({ queryKey: ['team'], queryFn: () => api.team() });
  const { data: audit } = useQuery({ queryKey: ['audit'], queryFn: () => api.audit() });

  return (
    <div className="flex flex-col gap-4 p-5">
      <h3 className="font-head text-[22px] font-bold">Team &amp; audit</h3>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Operators">
          {(data?.team.length ?? 0) === 0 ? (
            <Empty>Loading…</Empty>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>2FA</Th>
                  <Th>Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {data!.team.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">
                      <b>{o.name}</b>
                      <div className="font-mono text-[11px] text-slate">{o.email}</div>
                    </td>
                    <td className="px-4 py-2 capitalize">{o.role}</td>
                    <td className="px-4 py-2">
                      {o.totp_enrolled ? (
                        <Pill tone="live">Enrolled</Pill>
                      ) : (
                        <Pill tone="warn">Not yet</Pill>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-[12px]">
                      {o.last_seen_at ? new Date(o.last_seen_at).toLocaleString('en-IN') : 'never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Support grants" hint="24 hours, expire by themselves">
          {(data?.grants.length ?? 0) === 0 ? (
            <Empty>
              None. A support account sees no school at all until a ticket grants it one.
            </Empty>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>Operator</Th>
                  <Th>School</Th>
                  <Th>Expires</Th>
                </tr>
              </thead>
              <tbody>
                {data!.grants.map((g) => (
                  <tr key={g.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">{g.operator_name}</td>
                    <td className="px-4 py-2">{g.school_name}</td>
                    <td className="px-4 py-2">
                      {g.live ? (
                        <Pill tone="warn">
                          live until {new Date(g.expires_at).toLocaleString('en-IN')}
                        </Pill>
                      ) : (
                        <Pill tone="plain">expired</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Audit log" hint="Append-only · reads as well as writes">
        {(audit?.entries.length ?? 0) === 0 ? (
          <Empty>Nothing recorded yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>When</Th>
                  <Th>Who</Th>
                  <Th>Action</Th>
                  <Th>School</Th>
                  <Th>Subject</Th>
                  <Th>Detail</Th>
                  <Th>IP</Th>
                </tr>
              </thead>
              <tbody>
                {audit!.entries.map((e, i) => (
                  <tr key={i} className="border-b border-line last:border-0 hover:bg-paper">
                    <td className="px-4 py-2 font-mono text-[11.5px] whitespace-nowrap">
                      {new Date(e.at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11.5px]">{e.actor_email}</td>
                    <td className="px-4 py-2">
                      <Pill tone={e.action.endsWith('.read') ? 'info' : 'plain'}>{e.action}</Pill>
                    </td>
                    <td className="px-4 py-2">{e.school_name ?? '—'}</td>
                    <td className="px-4 py-2">{e.subject ?? '—'}</td>
                    <td className="max-w-[280px] truncate px-4 py-2 font-mono text-[11px] text-slate">
                      {JSON.stringify(e.detail)}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-slate">{e.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-[11.5px] leading-relaxed text-slate">
        Reads are logged in blue. If a parent ever asks who looked at their child&rsquo;s location,
        this table is the answer — which is why it refuses UPDATE and DELETE at the database rather
        than merely not offering a delete button.
      </p>
    </div>
  );
}
