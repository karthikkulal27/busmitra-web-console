import { useState } from 'react';
import { api, session } from '../lib/api';
import { Button } from '../components/ui';

/**
 * PA-01 — staff sign in.
 *
 * "Two-factor mandatory — this login can see every child's location."
 *
 * The enrolment case is on the same screen rather than behind an emailed link.
 * At three operators an email flow is another attack surface guarding the most
 * valuable account in the product, and the secret has to cross a screen
 * somewhere regardless.
 */
export function SignIn({ onSignedIn }: { onSignedIn: () => void }): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrol, setEnrol] = useState<{ secret: string; uri: string } | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.signIn(email, password, code);
      if (res.enrolTotp) {
        setEnrol(res.enrolTotp);
        return;
      }
      if (res.token && res.operator) {
        session.signIn(res.token, res.operator);
        onSignedIn();
      }
    } catch {
      // The server answers identically for a wrong password, a wrong code and
      // an account that does not exist. Saying more here would undo that.
      setError('That did not work. Check the password and the code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-card bg-bus font-head text-[22px] font-bold text-ink">
            B
          </div>
          <div>
            <b className="font-head text-[18px]">BusMitra</b>
            <div className="text-[12px] text-[#8FA0B6]">Console</div>
          </div>
        </div>

        <div>
          <h2 className="font-head text-[46px] leading-[1.05] font-bold">
            Every school.
            <br />
            Every bus.
            <br />
            One console.
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-[#A9B8CA]">
            Operator access. Every action here is written to an audit log with your name on it —
            including the ones that only read.
          </p>
        </div>

        <div className="font-mono text-[11.5px] text-[#63748C]">
          ap-south-1 · sessions expire after 12 hours
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h3 className="font-head text-[26px] font-bold">Sign in</h3>

          {enrol ? (
            <Enrol enrol={enrol} onDone={() => setEnrol(null)} />
          ) : (
            <>
              <p className="mt-1 mb-6 text-[13.5px] text-slate">Use your @busmitra.in account.</p>

              <Field label="Work email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full rounded-btn border border-line px-3 py-2.5 font-mono text-[14px]"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-btn border border-line px-3 py-2.5 font-mono text-[14px]"
                />
              </Field>
              <Field label="Authenticator code">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 digits"
                  className="w-full rounded-btn border border-line px-3 py-2.5 text-center font-mono text-[18px] tracking-[0.4em]"
                />
              </Field>

              {error ? <p className="mb-3 text-[12.5px] text-alert">{error}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-btn bg-ink px-4 py-3 text-[15px] font-bold text-white disabled:opacity-60"
              >
                {busy ? 'Checking…' : 'Sign in'}
              </button>

              <p className="mt-4 text-[11.5px] leading-relaxed text-slate">
                Support accounts are restricted: they can read a school only after that school
                raises a ticket, and only for 24 hours.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

/**
 * First sign-in on a new account. Shown once — the secret is stored the moment
 * it is generated, so there is no second chance to copy it and the screen says
 * so plainly.
 */
function Enrol({
  enrol,
  onDone,
}: {
  enrol: { secret: string; uri: string };
  onDone: () => void;
}): React.ReactElement {
  return (
    <div className="mt-4">
      <p className="mb-4 text-[13.5px] leading-relaxed text-slate">
        This account has no second factor yet. Add it to an authenticator app now — this is the
        only time the secret is shown.
      </p>

      <div className="mb-4 rounded-card border border-line bg-paper p-4">
        <div className="font-head text-[10px] font-bold tracking-[0.13em] text-slate uppercase">
          Secret
        </div>
        <div className="font-mono text-[15px] break-all">{enrol.secret}</div>
      </div>

      <div className="mb-4 rounded-card border border-line bg-paper p-4">
        <div className="font-head text-[10px] font-bold tracking-[0.13em] text-slate uppercase">
          Or paste this URI into the app
        </div>
        <div className="font-mono text-[11px] break-all text-slate">{enrol.uri}</div>
      </div>

      <Button kind="primary" onClick={onDone}>
        Done — sign in with a code
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block font-head text-[10px] font-bold tracking-[0.13em] text-slate uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
