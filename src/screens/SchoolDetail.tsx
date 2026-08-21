import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Empty, Pill, Th } from '../components/ui';
import { api, rupees } from '../lib/api';

/**
 * PA-04 — school detail.
 *
 * "One page you can read out loud on a call with the principal." Which is the
 * test every block here has to pass: if you could not say it down a phone
 * without first explaining what it means, it does not belong.
 */
export function SchoolDetail(): React.ReactElement {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['school', id],
    queryFn: () => api.school(id),
    retry: false,
  });

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => api.saveCommercials(id, input),
    onSuccess: () => {
      setNote('Saved.');
      void queryClient.invalidateQueries({ queryKey: ['school', id] });
    },
    onError: () => setNote('Could not save — a support account cannot change commercials.'),
  });

  if (isLoading) return <Empty>Loading…</Empty>;
  if (error || !data) {
    return (
      <Empty>
        You cannot see this school. Support accounts need a live ticket grant, and grants last 24
        hours.
      </Empty>
    );
  }

  const s = data.school as Record<string, string | number | boolean | null>;
  const paused = s['parent_app_paused'] === true;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="font-head text-[22px] font-bold">{String(s['name'])}</h3>
          <div className="font-mono text-[12px] text-slate">
            {String(s['code'])} · {s['live_since'] ? `live since ${s['live_since']}` : 'not live yet'}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {paused ? <Pill tone="bad">Parent app paused</Pill> : <Pill tone="live">Running</Pill>}
          <Button
            onClick={() => save.mutate({ parentAppPaused: !paused })}
            kind={paused ? 'primary' : 'plain'}
          >
            {paused ? 'Unpause the parent app' : 'Pause the parent app'}
          </Button>
        </div>
      </div>

      {note ? (
        <p className="rounded-btn border border-line bg-white px-3 py-2 text-[12.5px]">{note}</p>
      ) : null}

      <p className="rounded-card border border-bus bg-[#FFF8E6] px-3.5 py-2.5 text-[12px] leading-relaxed">
        Pausing stops the <b>parent app only</b>. The school office keeps its console, drivers keep
        reporting, and every safety alert keeps firing. There is no switch anywhere in this product
        that can do more than that, on purpose.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card title="Recent trips" hint="Newest first">
            {data.recentTrips.length === 0 ? (
              <Empty>No trips recorded.</Empty>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    <Th>Date</Th>
                    <Th>Route</Th>
                    <Th>Bus</Th>
                    <Th>Empty check</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTrips.map((t, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 font-mono">
                        {String(t['date'])} · {String(t['shift'])}
                      </td>
                      <td className="px-4 py-2">{String(t['route_name'])}</td>
                      <td className="px-4 py-2 font-mono">{String(t['plate'])}</td>
                      <td className="px-4 py-2">
                        {t['empty_checked'] ? (
                          <Pill tone="live">Done</Pill>
                        ) : (
                          <Pill tone="bad">Not done</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Open alerts" hint="Unhandled">
            {data.openAlerts.length === 0 ? (
              <Empty>Nothing open.</Empty>
            ) : (
              <div>
                {data.openAlerts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0"
                  >
                    <Pill tone={a['severity'] === 'critical' ? 'bad' : 'warn'}>
                      {String(a['type']).replace(/_/g, ' ')}
                    </Pill>
                    <span className="truncate font-mono text-[11.5px] text-slate">
                      {JSON.stringify(a['payload'])}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Commercials">
            <div className="p-4">
              <Line label="Plan" value={String(s['plan'])} />
              <Line label="Price per bus" value={`${rupees(Number(s['price_per_bus_paise']))} / month`} />
              <Line label="Buses" value={String(s['buses'])} />
              <Line
                label="This month"
                value={rupees(Number(s['price_per_bus_paise']) * Number(s['buses']))}
              />
              <Line label="GSTIN" value={String(s['gstin'] ?? '—')} />
              <Line label="Trial ends" value={String(s['trial_ends_on'] ?? '—')} />

              <div className="mt-3 flex gap-2">
                {(['trial', 'basic', 'standard'] as const).map((plan) => (
                  <Button
                    key={plan}
                    kind={s['plan'] === plan ? 'primary' : 'plain'}
                    onClick={() => save.mutate({ plan })}
                  >
                    {plan}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Size">
            <div className="p-4">
              <Line label="Routes" value={String(s['routes'])} />
              <Line label="Children" value={String(s['children'])} />
              <Line label="Staff" value={String(s['staff'])} />
              <Line label="City" value={String(s['city'])} />
            </div>
          </Card>

          <Card title="Invoices">
            {data.invoices.length === 0 ? (
              <Empty>None raised.</Empty>
            ) : (
              <div className="p-4">
                {data.invoices.map((i, n) => (
                  <Line
                    key={n}
                    label={`${String(i['number'])} · ${String(i['period'])}`}
                    value={`${rupees(Number(i['amount_paise']) + Number(i['gst_paise']))} · ${String(i['status'])}`}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-2 text-[12.5px] last:border-0">
      <span className="text-slate">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
