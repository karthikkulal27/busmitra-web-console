import type { ReactNode } from 'react';

/**
 * The console's shared furniture.
 *
 * Ink-first, unlike the school console's paper-and-yellow. Two tabs open beside
 * each other at 7:15 on a Friday must never be mistaken for one another —
 * clicking "pause the parent app" thinking you are in a school's own settings
 * is the kind of mistake a colour scheme should prevent.
 */

export function Card({
  title,
  hint,
  action,
  children,
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {title ? (
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <h4 className="font-head text-[15px] font-bold">{title}</h4>
          {hint ? <span className="text-[11.5px] text-slate">{hint}</span> : null}
          {action ? <div className="ml-auto">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: 'alert' | 'live' | 'hot';
}): React.ReactElement {
  return (
    <div
      className={`rounded-card border p-3.5 ${
        tone === 'hot' ? 'border-ink bg-ink text-white' : 'border-line bg-white'
      }`}
    >
      <div
        className={`font-head text-[10px] font-bold tracking-[0.13em] uppercase ${
          tone === 'hot' ? 'text-[#8FA0B6]' : 'text-slate'
        }`}
      >
        {label}
      </div>
      <div
        className={`font-mono text-[26px] leading-tight font-semibold ${
          tone === 'alert' ? 'text-alert' : tone === 'live' ? 'text-live' : ''
        }`}
      >
        {value}
      </div>
      {detail ? (
        <div className={`text-[11.5px] ${tone === 'hot' ? 'text-[#8FA0B6]' : 'text-slate'}`}>
          {detail}
        </div>
      ) : null}
    </div>
  );
}

const PILL_TONES: Record<string, string> = {
  live: 'bg-[#E1F4EC] text-[#0F7A50]',
  warn: 'bg-[#FFF2D6] text-[#8A5B00]',
  bad: 'bg-[#FBE4E1] text-[#A62A1B]',
  info: 'bg-[#E7EDF6] text-[#2C4B78]',
  plain: 'bg-paper text-slate',
};

export function Pill({
  tone = 'plain',
  children,
}: {
  tone?: keyof typeof PILL_TONES | string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${
        PILL_TONES[tone] ?? PILL_TONES['plain']
      }`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  kind = 'plain',
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'plain' | 'primary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
}): React.ReactElement {
  const styles = {
    plain: 'border border-line bg-white hover:bg-paper',
    primary: 'bg-ink text-white hover:bg-ink2',
    danger: 'bg-alert text-white',
  }[kind];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-btn px-3.5 py-2 text-[13px] font-bold disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

export function Th({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <th className="px-4 py-2.5 text-left font-head text-[10px] font-bold tracking-[0.12em] text-slate uppercase">
      {children}
    </th>
  );
}

export function Empty({ children }: { children: ReactNode }): React.ReactElement {
  return <div className="px-4 py-10 text-center text-[13px] text-slate">{children}</div>;
}

/** The six-bar sparkline PA-03 uses for driver app usage. */
export function Spark({ values }: { values: number[] }): React.ReactElement {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-6 items-end gap-[2px]">
      {values.map((v, i) => (
        <i
          key={i}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          className={`w-[5px] rounded-[1px] ${v >= max * 0.6 ? 'bg-ink' : 'bg-line'}`}
        />
      ))}
    </div>
  );
}
