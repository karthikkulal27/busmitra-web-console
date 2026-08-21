import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, Empty, Pill, Th } from '../components/ui';
import { api } from '../lib/api';
import type { SchoolRow } from '../lib/api';

/**
 * PA-03 — schools.
 *
 * The prototype's note: "Health column is the retention early-warning system:
 * driver app usage, not logins." And: "if drivers stop opening the app, the
 * school churns in 8 weeks."
 *
 * So driver usage is the widest column and the one the table sorts by when
 * anything is wrong. Everything else on the row exists to explain it.
 */
export function Schools(): React.ReactElement {
  const { data, isLoading } = useQuery({ queryKey: ['schools'], queryFn: () => api.schools() });

  const rows = data?.schools ?? [];
  const counts = {
    healthy: rows.filter((r) => r.status === 'healthy').length,
    at_risk: rows.filter((r) => r.status === 'at_risk').length,
    critical: rows.filter((r) => r.status === 'devices' || r.status === 'payment').length,
    trial: rows.filter((r) => r.status === 'trial').length,
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-head text-[22px] font-bold">Schools</h3>
        <div className="ml-auto flex gap-2">
          <Pill tone="live">Healthy {counts.healthy}</Pill>
          <Pill tone="warn">At risk {counts.at_risk}</Pill>
          <Pill tone="bad">Critical {counts.critical}</Pill>
          <Pill tone="info">Trial {counts.trial}</Pill>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Empty>Loading…</Empty>
        ) : rows.length === 0 ? (
          <Empty>
            No schools you can see. A support account sees a school only while a ticket grants it.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>School</Th>
                  <Th>City</Th>
                  <Th>Buses</Th>
                  <Th>Children</Th>
                  <Th>Driver app usage</Th>
                  <Th>Parent adoption</Th>
                  <Th>Plan</Th>
                  <Th>Health</Th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => (a.health ?? 101) - (b.health ?? 101))
                  .map((s) => (
                    <tr key={s.id} className="border-b border-line last:border-0 hover:bg-paper">
                      <td className="px-4 py-2.5">
                        <Link to={`/schools/${s.id}`} className="font-semibold hover:underline">
                          {s.name}
                        </Link>
                        <div className="text-[11px] text-slate">
                          {s.liveSince ? `Since ${s.liveSince}` : 'Not live yet'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">{s.city}</td>
                      <td className="px-4 py-2.5 font-mono">{s.buses}</td>
                      <td className="px-4 py-2.5 font-mono">{s.children}</td>
                      <td className="px-4 py-2.5">
                        <Usage percent={s.driverUsagePercent} />
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {s.parentAdoptionPercent === null ? '—' : `${s.parentAdoptionPercent}%`}
                      </td>
                      <td className="px-4 py-2.5 capitalize">{s.plan}</td>
                      <td className="px-4 py-2.5">
                        <Health row={s} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-[11.5px] leading-relaxed text-slate">
        Health = driver app usage 60% + parent adoption 25% + payment 15%. Usage is trips actually
        run against trips expected — not logins. A driver who signs in and never starts a trip has
        told us nothing except that the phone works.
      </p>
    </div>
  );
}

function Usage({ percent }: { percent: number | null }): React.ReactElement {
  if (percent === null) {
    return <span className="text-[12px] text-slate">no routes yet</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
        <div
          style={{ width: `${percent}%` }}
          className={`h-full ${percent < 40 ? 'bg-alert' : percent < 70 ? 'bg-bus' : 'bg-live'}`}
        />
      </div>
      <span className="font-mono text-[12px]">{percent}%</span>
    </div>
  );
}

function Health({ row }: { row: SchoolRow }): React.ReactElement {
  if (row.status === 'payment') return <Pill tone="bad">Payment {row.overdueDays} d</Pill>;
  if (row.status === 'devices') return <Pill tone="bad">Devices down</Pill>;
  if (row.status === 'at_risk') return <Pill tone="warn">At risk</Pill>;
  if (row.status === 'trial') {
    return <Pill tone="info">{row.trialEndsOn ? `Trial to ${row.trialEndsOn}` : 'Trial'}</Pill>;
  }
  return <Pill tone="live">Healthy {row.health ?? ''}</Pill>;
}
