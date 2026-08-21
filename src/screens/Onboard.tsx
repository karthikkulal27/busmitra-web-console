import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Empty, Pill } from '../components/ui';
import { api, rupees } from '../lib/api';
import type { SchoolRow } from '../lib/api';

/**
 * PA-05 — onboard a school.
 *
 * "Your onboarding cost is the whole business model. Target: live in 4 hours,
 * not 4 weeks."
 *
 * Which is why this screen deliberately does **not** re-implement the work. The
 * school console already has a route editor, an Excel importer with Kannada
 * transliteration matching, and a staff screen — all of it built, all of it
 * used by the school afterwards. Building a second copy here would mean two
 * importers to keep in step, and the operator would be entering data the school
 * then cannot edit.
 *
 * So this is a **progress board**, not a wizard: it reads the same six facts
 * from the same tables the school console writes, and links straight into the
 * screen that fixes each one. Whoever is doing the onboarding — you on a call,
 * or the school's own clerk — is working in the same place.
 *
 * The go-live gate is the part that matters: parent alerts stay off until all
 * six are green. The prototype is explicit that a school switched on with two
 * routes untested produces a first week of wrong notifications, and a parent
 * who is told the wrong thing twice stops opening the app.
 */
export function Onboard(): React.ReactElement {
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['schools'], queryFn: () => api.schools() });

  const onboarding = (data?.schools ?? []).filter(
    (s) => s.plan === 'trial' || s.liveSince === null,
  );

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="font-head text-[22px] font-bold">Onboarding</h3>
          <div className="text-[12.5px] text-slate">
            Target: live in 4 hours, not 4 weeks
          </div>
        </div>
        <div className="ml-auto">
          <Button kind="primary" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Cancel' : 'Add a school'}
          </Button>
        </div>
      </div>

      {note ? (
        <p className="rounded-btn border border-line bg-white px-3 py-2 text-[12.5px]">{note}</p>
      ) : null}

      {adding ? (
        <NewSchool
          onDone={(m) => {
            setNote(m);
            setAdding(false);
          }}
        />
      ) : null}

      {isLoading ? (
        <Empty>Loading…</Empty>
      ) : onboarding.length === 0 ? (
        <Card>
          <Empty>
            Nobody is mid-onboarding. A school appears here while it is on a trial or has no
            go-live date.
          </Empty>
        </Card>
      ) : (
        onboarding.map((s) => <Board key={s.id} school={s} />)
      )}

      <Card title="How a school gets set up" hint="Six steps, in this order">
        <div className="p-4">
          <ol className="flex flex-col gap-2.5 text-[13px]">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper font-mono text-[11px] font-bold">
                  {i + 1}
                </span>
                <div>
                  <b>{step.title}</b>
                  <div className="text-slate">{step.detail}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[11.5px] leading-relaxed text-slate">
            Every one of these is done in the school&rsquo;s own console, not here. That is
            deliberate: the clerk who imports the children is the person who will correct them in
            October, and data entered by an operator in a screen the school cannot reach is data
            nobody maintains.
          </p>
        </div>
      </Card>
    </div>
  );
}

const STEPS = [
  {
    title: 'School & plan',
    detail: 'Create the school, set the per-bus price and the trial end date. On the school page.',
  },
  {
    title: 'Buses',
    detail: 'Plate, seats, fitness certificate expiry. SA-08.',
  },
  {
    title: 'Routes & stops',
    detail:
      'Draw each route, drag the stops into order, set the scheduled time at every stop. SA-05 — and the times matter more than they look: the ETA and the late-start alert are both measured against them.',
  },
  {
    title: 'Children',
    detail:
      "Upload the school's own Excel. Do not retype it. The importer guesses the columns and matches stop spellings on sound rather than letters, which clears about 80% of the unclear ones — a Kannada-English transliteration match, not a string compare. SA-06.",
  },
  {
    title: 'Drivers',
    detail:
      'Add each driver with the phone they actually carry, then have them sign in once. The install shows up on Devices, which is how you know the app is really on the phone rather than promised.',
  },
  {
    title: 'Go live',
    detail:
      'Run one test trip on every route before parent alerts go on. A school switched on with two routes untested spends its first week sending wrong notifications.',
  },
];

function Board({ school }: { school: SchoolRow }): React.ReactElement {
  // Each of these is read from the same table the school console writes to.
  const checks = [
    {
      label: 'Buses added',
      done: school.buses > 0,
      value: `${school.buses}`,
      to: `/schools/${school.id}`,
    },
    {
      label: 'Routes drawn and timed',
      done: school.driverUsagePercent !== null,
      value: school.driverUsagePercent === null ? 'no routes yet' : 'done',
      to: `/schools/${school.id}`,
    },
    {
      label: 'Children imported',
      done: school.children > 0,
      value: `${school.children}`,
      to: `/schools/${school.id}`,
    },
    {
      label: 'Driver app in use',
      done: (school.driverUsagePercent ?? 0) > 30,
      value:
        school.driverUsagePercent === null ? '—' : `${school.driverUsagePercent}% of expected trips`,
      to: '/devices',
    },
    {
      label: 'Parents opening the app',
      done: (school.parentAdoptionPercent ?? 0) > 0,
      value:
        school.parentAdoptionPercent === null ? '—' : `${school.parentAdoptionPercent}%`,
      to: '/devices',
    },
    {
      label: 'Plan agreed',
      done: school.plan !== 'trial',
      value: school.plan,
      to: `/schools/${school.id}`,
    },
  ];

  const doneCount = checks.filter((c) => c.done).length;

  return (
    <Card
      title={school.name}
      hint={school.trialEndsOn ? `trial ends ${school.trialEndsOn}` : school.city}
      action={
        doneCount === checks.length ? (
          <Pill tone="live">Ready to go live</Pill>
        ) : (
          <Pill tone="warn">
            {doneCount} of {checks.length}
          </Pill>
        )
      }
    >
      <div className="p-4">
        {checks.map((c, i) => (
          <Link
            key={i}
            to={c.to}
            className="flex items-center gap-3 border-b border-line py-2.5 text-[13px] last:border-0 hover:bg-paper"
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                c.done ? 'bg-live text-white' : 'bg-line text-slate'
              }`}
            >
              {c.done ? '✓' : ''}
            </span>
            <span className={c.done ? '' : 'text-slate'}>{c.label}</span>
            <span className="ml-auto font-mono text-[12px] text-slate">{c.value}</span>
          </Link>
        ))}

        <p className="mt-3 rounded-btn border border-bus bg-[#FFF8E6] px-3 py-2 text-[11.5px] leading-relaxed">
          <b>All six green before parent alerts go on.</b> A school switched on with two routes
          untested spends its first week sending wrong notifications, and a parent who is told the
          wrong thing twice stops opening the app.
        </p>
      </div>
    </Card>
  );
}


/**
 * Step one of the six below, and the only one that is ours rather than the
 * school's. It was raw SQL until now: fine for the first three schools, wrong by
 * the tenth.
 *
 * The code is the field that matters operationally. It goes on the welcome
 * letter and a clerk types it every morning to sign in, so it is upper-cased and
 * a collision comes back as something a person can act on.
 */
function NewSchool({ onDone }: { onDone: (message: string) => void }): React.ReactElement {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [plan, setPlan] = useState('trial');
  const [price, setPrice] = useState('1200');
  const [trialEnds, setTrialEnds] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.createSchool({
        name: name.trim(),
        code: code.trim(),
        city: city.trim(),
        plan,
        // Rule 8: rupees for the human, paise everywhere else.
        pricePerBusPaise: Math.round(Number(price || '0') * 100),
        trialEndsOn: plan === 'trial' && trialEnds ? trialEnds : null,
        officePhone: officePhone.trim() || null,
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['schools'] });
      onDone(name.trim() + ' created. Sign-in code is ' + res.code + '.');
    },
    onError: (e: Error) =>
      setError(
        e.message.includes('code_already_used')
          ? 'That code is already used by another school. Pick a different one.'
          : 'Could not create the school.',
      ),
  });

  const ok = name.trim().length >= 3 && code.trim().length >= 3 && city.trim().length >= 2;

  return (
    <Card title="Add a school">
      <form
        className="grid gap-3 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate();
        }}
      >
        <F label="School name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sharada Vidyalaya, Kodialbail"
            className="w-full rounded-btn border border-line px-3 py-2 text-[14px]"
          />
        </F>
        <F label="Sign-in code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SVK-MNG-014"
            className="w-full rounded-btn border border-line px-3 py-2 font-mono text-[14px]"
          />
        </F>
        <F label="City">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Mangalore"
            className="w-full rounded-btn border border-line px-3 py-2 text-[14px]"
          />
        </F>
        <F label="Office phone (optional)">
          <input
            value={officePhone}
            onChange={(e) => setOfficePhone(e.target.value)}
            placeholder="0824 2345678"
            className="w-full rounded-btn border border-line px-3 py-2 font-mono text-[14px]"
          />
        </F>
        <F label="Plan">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full rounded-btn border border-line px-3 py-2 text-[14px]"
          >
            <option value="trial">Trial</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
          </select>
        </F>
        <F label="Price per bus, per month">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
            inputMode="decimal"
            className="w-full rounded-btn border border-line px-3 py-2 font-mono text-[14px]"
          />
        </F>
        {plan === 'trial' ? (
          <F label="Trial ends">
            <input
              type="date"
              value={trialEnds}
              onChange={(e) => setTrialEnds(e.target.value)}
              className="w-full rounded-btn border border-line px-3 py-2 font-mono text-[14px]"
            />
          </F>
        ) : null}

        {error ? <p className="text-[12.5px] text-alert sm:col-span-2">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button kind="primary" type="submit" disabled={!ok || create.isPending}>
            {create.isPending ? 'Creating...' : 'Create school'}
          </Button>
          <span className="text-[12px] text-slate">
            {price ? rupees(Math.round(Number(price) * 100)) + ' per bus per month.' : 'Set a price.'}{' '}
            Trials are never invoiced.
          </span>
        </div>
      </form>
    </Card>
  );
}

function F({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="block">
      <span className="mb-1.5 block font-head text-[10px] font-bold tracking-[0.13em] text-slate uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
