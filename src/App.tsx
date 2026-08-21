import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { session } from './lib/api';
import { Billing } from './screens/Billing';
import { Devices } from './screens/Devices';
import { Onboard } from './screens/Onboard';
import { Operations } from './screens/Operations';
import { SchoolDetail } from './screens/SchoolDetail';
import { Schools } from './screens/Schools';
import { SignIn } from './screens/SignIn';
import { Support } from './screens/Support';
import { System } from './screens/System';
import { Team } from './screens/Team';

const NAV = [
  { to: '/', label: 'Operations', end: true },
  { to: '/schools', label: 'Schools' },
  { to: '/onboard', label: 'Onboarding' },
  { to: '/devices', label: 'Devices' },
  { to: '/billing', label: 'Billing' },
  { to: '/support', label: 'Support' },
  { to: '/system', label: 'System' },
  { to: '/team', label: 'Team & audit' },
];

export function App(): React.ReactElement {
  const [signedIn, setSignedIn] = useState(() => session.token !== null);

  if (!signedIn) return <SignIn onSignedIn={() => setSignedIn(true)} />;

  const me = session.operator;

  return (
    <div className="grid h-full grid-cols-[210px_1fr]">
      <nav className="flex flex-col bg-ink p-3 text-white">
        <div className="mb-5 flex items-center gap-2.5 px-2 pt-2">
          <div className="grid h-9 w-9 place-items-center rounded-btn bg-bus font-head text-[18px] font-bold text-ink">
            B
          </div>
          <div>
            <b className="font-head text-[15px]">BusMitra</b>
            <div className="text-[11px] text-[#8FA0B6]">Console</div>
          </div>
        </div>

        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `rounded-btn px-3 py-2 text-[13.5px] font-semibold ${
                isActive ? 'bg-ink2 text-white' : 'text-[#A9B8CA] hover:text-white'
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}

        <div className="mt-auto border-t border-[#2C3B50] px-2 pt-3">
          <div className="text-[12.5px] font-semibold">{me?.name}</div>
          <div className="text-[11px] text-[#8FA0B6] capitalize">{me?.role}</div>
          {me?.role === 'support' ? (
            <div className="mt-2 rounded-btn bg-[#2C3B50] px-2 py-1.5 text-[10.5px] leading-snug text-[#A9B8CA]">
              Restricted. You see a school only while a ticket grants it, for 24 hours.
            </div>
          ) : null}
          <button
            onClick={() => {
              session.signOut();
              setSignedIn(false);
            }}
            className="mt-2 text-[11.5px] text-[#8FA0B6] hover:text-white"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="overflow-y-auto">
        <Routes>
          <Route path="/" element={<Operations />} />
          <Route path="/schools" element={<Schools />} />
          <Route path="/schools/:id" element={<SchoolDetail />} />
          <Route path="/onboard" element={<Onboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/:id" element={<Support />} />
          <Route path="/system" element={<System />} />
          <Route path="/team" element={<Team />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
