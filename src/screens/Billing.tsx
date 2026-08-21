import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, Empty, Kpi, Pill, Th } from '../components/ui';
import { api, rupees } from '../lib/api';

/**
 * PA-07 — billing.
 *
 * "Per-bus, per-month, invoiced to the school. Never to parents — that kills
 * adoption." There is deliberately no parent-facing payment anywhere in this
 * product, and nothing on this screen can create one.
 *
 * The other note is the one that shapes the buttons: "Pause-on-non-payment must
 * be gentle: stop the parent app, keep the office console and safety alerts
 * running. Cutting off a safety product over ₹5,000 is a reputation event in a
 * small city." Pausing lives on the school's own page, phrased as exactly what
 * it does, and there is no column in the database that could do more.
 */
export function Billing(): React.ReactElement {
  const queryClient = useQueryClient();
  const [note, setNote] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['billing'], queryFn: () => api.billing() });

  const raise = useMutation({
    mutationFn: () => api.raiseInvoices(),
    onSuccess: (res) => {
      setNote(
        res.raised === 0
          ? 'Nothing to raise — every billable school already has an invoice for this month.'
          : `${res.raised} invoice${res.raised === 1 ? '' : 's'} raised.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: () => setNote('Could not raise invoices.'),
  });

  const pay = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) => api.markPaid(id, method),
    onSuccess: () => {
      setNote('Marked paid. If nothing else is overdue, the parent app is unpaused too.');
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });

  const t = data?.totals;
  const overdue = (data?.invoices ?? []).filter((i) => i.status === 'open' && i.days_late > 0);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-head text-[22px] font-bold">Billing</h3>
        <div className="ml-auto">
          <Button kind="primary" onClick={() => raise.mutate()} disabled={raise.isPending}>
            {raise.isPending ? 'Raising…' : 'Raise invoices for this month'}
          </Button>
        </div>
      </div>

      {note ? (
        <p className="rounded-btn border border-line bg-white px-3 py-2 text-[12.5px]">{note}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Monthly recurring"
          value={t ? rupees(t.mrrPaise, { lakh: true }) : '—'}
          detail="Billed schools, active buses"
          tone="hot"
        />
        <Kpi
          label="Collected this month"
          value={t ? rupees(t.collectedPaise, { lakh: true }) : '—'}
          detail={t ? `${t.openCount} invoice${t.openCount === 1 ? '' : 's'} still open` : undefined}
        />
        <Kpi
          label="Overdue"
          value={t ? rupees(t.overduePaise) : '—'}
          detail={
            overdue.length === 0
              ? 'Nobody is late'
              : `${overdue.length} invoice${overdue.length === 1 ? '' : 's'} · oldest ${Math.max(
                  ...overdue.map((i) => i.days_late),
                )} days`
          }
          tone={(t?.overduePaise ?? 0) > 0 ? 'alert' : undefined}
        />
        <Kpi
          label="Raised safely"
          value="Idempotent"
          detail="One invoice per school per month, enforced by the database"
        />
      </div>

      <Card title="Invoices">
        {isLoading ? (
          <Empty>Loading…</Empty>
        ) : (data?.invoices.length ?? 0) === 0 ? (
          <Empty>
            No invoices yet. &ldquo;Raise invoices&rdquo; bills every school on a paid plan —
            trials are skipped, because an invoice arriving during one is how a trial ends badly.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>School</Th>
                  <Th>Invoice</Th>
                  <Th>Period</Th>
                  <Th>Buses</Th>
                  <Th>Amount</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {data!.invoices.map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-0 hover:bg-paper">
                    <td className="px-4 py-2.5 font-semibold">{i.school_name}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px]">{i.number}</td>
                    <td className="px-4 py-2.5">{i.period}</td>
                    <td className="px-4 py-2.5 font-mono">{i.buses}</td>
                    <td className="px-4 py-2.5 font-mono">
                      {rupees(i.amount_paise)}
                      <span className="text-[11px] text-slate"> + {rupees(i.gst_paise)} GST</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{i.due_on}</td>
                    <td className="px-4 py-2.5">
                      {i.status === 'paid' ? (
                        <Pill tone="live">Paid · {i.paid_method?.toUpperCase()}</Pill>
                      ) : i.days_late > 0 ? (
                        <Pill tone="bad">{i.days_late} days late</Pill>
                      ) : (
                        <Pill tone="warn">Open</Pill>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {i.status === 'open' ? (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) pay.mutate({ id: i.id, method: e.target.value });
                          }}
                          className="rounded-btn border border-line px-2 py-1.5 text-[12px]"
                        >
                          <option value="">Mark paid…</option>
                          <option value="upi">UPI</option>
                          <option value="neft">NEFT</option>
                          <option value="cheque">Cheque</option>
                          <option value="cash">Cash</option>
                        </select>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-[11.5px] leading-relaxed text-slate">
        Every figure here is stored as integer paise and only becomes rupees on this screen. GST is
        18%, computed in paise and rounded to the paisa — the arithmetic never passes through a
        float.
      </p>
    </div>
  );
}
