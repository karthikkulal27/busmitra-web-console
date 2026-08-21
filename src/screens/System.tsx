import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Kpi, Th } from '../components/ui';
import { api } from '../lib/api';

/**
 * PA-09 — system health.
 *
 * "One screen, because at your scale the only real risks are the queue backing
 * up and the DB filling."
 *
 * So there are no CPU graphs. The one number that will actually bite is the
 * retention job: rule 6 says `locations` keeps 90 days and drops partitions, and
 * a partition older than that still sitting there does not mean the disk is
 * large — it means the maintenance stopped running and nobody noticed.
 */
export function System(): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: ['system'],
    queryFn: () => api.system(),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <Empty>Loading…</Empty>;
  const db = data.db;

  return (
    <div className="flex flex-col gap-4 p-5">
      <h3 className="font-head text-[22px] font-bold">System</h3>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Database" value={gb(db.sizeBytes)} detail="Total on disk" tone="hot" />
        <Kpi
          label="Positions table"
          value={gb(db.locationsBytes)}
          detail={`${db.partitions} monthly partitions`}
        />
        <Kpi
          label="Positions today"
          value={db.locationsToday.toLocaleString('en-IN')}
          detail="Rows written since midnight"
        />
        <Kpi
          label="Retention"
          value={db.retentionOverdueMonths > 0 ? `${db.retentionOverdueMonths} mo overdue` : 'OK'}
          detail={db.oldestPartition ?? 'no partitions yet'}
          tone={db.retentionOverdueMonths > 0 ? 'alert' : 'live'}
        />
      </div>

      {db.retentionOverdueMonths > 0 ? (
        <Card title="Retention is behind">
          <div className="p-4 text-[13px] leading-relaxed">
            <p>
              The oldest partition is <span className="font-mono">{db.oldestPartition}</span>, which
              is past the 90-day retention CLAUDE.md sets. Nothing drops partitions automatically
              yet — that job is not built.
            </p>
            <p className="mt-2 text-slate">
              Rule 6: retention is enforced by <b>DROP PARTITION, never DELETE</b>. Deleting rows
              from a 3-million-row month rewrites the table and takes the database with it.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-btn bg-paper p-3 font-mono text-[12px]">
              {`drop table locations_${db.oldestPartition?.split('_').slice(-2).join('_') ?? 'YYYY_MM'};`}
            </pre>
          </div>
        </Card>
      ) : null}

      <Card title="What this screen deliberately does not show">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line">
              <Th>Not here</Th>
              <Th>Why</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ['CPU and memory graphs', 'Render already draws them, and neither has ever been the thing that broke.'],
              ['Request latency percentiles', 'The ingest path is a socket write and a buffer push. If it were slow you would see it as a queue backlog first.'],
              ['Uptime badge', 'A green tick that is always green teaches you to stop reading it.'],
            ].map(([a, b], i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-semibold">{a}</td>
                <td className="px-4 py-2 text-slate">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function gb(bytes: number): string {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.round(bytes / 1e3)} kB`;
}
