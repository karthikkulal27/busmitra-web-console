import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Kpi, Pill, Th } from '../components/ui';
import { api } from '../lib/api';

/**
 * PA-06 — device health.
 *
 * "You don't sell hardware, but you own the uptime. This screen is where you
 * catch it first."
 *
 * Which is why the four counters at the top are all *permissions and versions*
 * rather than anything about buses. A driver whose battery optimisation came
 * back on after an OS update has a phone that works perfectly and a bus that
 * vanishes from the map at 7:20, and nothing except this screen will tell you
 * before the school does.
 */
export function Devices(): React.ReactElement {
  const { data, isLoading } = useQuery({ queryKey: ['devices'], queryFn: () => api.devices() });
  const p = data?.problems;

  return (
    <div className="flex flex-col gap-4 p-5">
      <h3 className="font-head text-[22px] font-bold">Device health</h3>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Battery saver back on"
          value={p?.batteryRestricted ?? '—'}
          detail="Driver phones · the bus will disappear"
          tone={(p?.batteryRestricted ?? 0) > 0 ? 'alert' : undefined}
        />
        <Kpi
          label="Location not Always"
          value={p?.locationNotAlways ?? '—'}
          detail="Reports only while the app is open"
          tone={(p?.locationNotAlways ?? 0) > 0 ? 'alert' : undefined}
        />
        <Kpi
          label="Push denied"
          value={p?.pushDenied ?? '—'}
          detail="Parents who cannot be told anything"
          tone={(p?.pushDenied ?? 0) > 0 ? 'alert' : undefined}
        />
        <Kpi
          label="Silent a week"
          value={p?.silentAWeek ?? '—'}
          detail="App not opened in 7 days"
        />
      </div>

      <Card title="Versions in the field" hint="A stale build is a release problem, not a support one">
        {isLoading ? (
          <Empty>Loading…</Empty>
        ) : (data?.versions.length ?? 0) === 0 ? (
          <Empty>
            No installs have reported yet. Both apps post to <code>/telemetry/install</code> on
            launch — nothing appears here until one runs against this server.
          </Empty>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <Th>App</Th>
                <Th>Version</Th>
                <Th>Installs</Th>
                <Th>Active this week</Th>
              </tr>
            </thead>
            <tbody>
              {data!.versions.map((v, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 capitalize">{v.app}</td>
                  <td className="px-4 py-2 font-mono">{v.app_version}</td>
                  <td className="px-4 py-2 font-mono">{v.installs}</td>
                  <td className="px-4 py-2 font-mono">{v.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Installs" hint="Most recently seen first">
        {(data?.installs.length ?? 0) === 0 ? (
          <Empty>Nothing reported yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>Who</Th>
                  <Th>School</Th>
                  <Th>App</Th>
                  <Th>Device</Th>
                  <Th>Permissions</Th>
                  <Th>Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {data!.installs.map((d, i) => (
                  <tr key={i} className="border-b border-line last:border-0 hover:bg-paper">
                    <td className="px-4 py-2">
                      {String(d['staff_name'] ?? '—')}
                      <div className="font-mono text-[11px] text-slate">{String(d['phone'])}</div>
                    </td>
                    <td className="px-4 py-2">{String(d['school_name'] ?? '—')}</td>
                    <td className="px-4 py-2">
                      <span className="capitalize">{String(d['app'])}</span>{' '}
                      <span className="font-mono text-[11px] text-slate">
                        {String(d['app_version'])}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[12px]">
                      {String(d['device_model'] ?? '—')}
                      <div className="text-[11px] text-slate">
                        {String(d['platform'])} {String(d['os_version'] ?? '')}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {d['push_permission'] === 'denied' ? (
                          <Pill tone="bad">Push denied</Pill>
                        ) : null}
                        {d['app'] === 'driver' && d['location_permission'] !== 'always' ? (
                          <Pill tone="bad">Location {String(d['location_permission'])}</Pill>
                        ) : null}
                        {d['app'] === 'driver' && d['battery_unrestricted'] === false ? (
                          <Pill tone="bad">Battery saver on</Pill>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-[12px]">
                      {new Date(String(d['last_seen_at'])).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
