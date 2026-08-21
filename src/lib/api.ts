const BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:4000';

const TOKEN_KEY = 'busmitra.console.token';
const WHO_KEY = 'busmitra.console.operator';

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'ops' | 'support';
}

/**
 * sessionStorage, not localStorage.
 *
 * The operator token is worth more than any other in the product — it can see
 * every child in every school — and the server already keeps it to 12 hours.
 * Holding it in sessionStorage means closing the tab ends the session, which is
 * the behaviour someone working from a laptop in a coffee shop should get
 * without having to think about it.
 */
export const session = {
  get token(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },
  get operator(): Operator | null {
    const raw = sessionStorage.getItem(WHO_KEY);
    return raw ? (JSON.parse(raw) as Operator) : null;
  },
  signIn(token: string, operator: Operator): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(WHO_KEY, JSON.stringify(operator));
  },
  signOut(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(WHO_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`${status} ${code}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = session.token;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.text()) || '{}';
  const parsed = JSON.parse(body) as Record<string, unknown>;

  if (res.status === 401 && token) {
    // The 12-hour token has run out mid-session. Drop straight back to the
    // sign-in screen rather than showing empty tables that look like a bug.
    session.signOut();
    window.location.reload();
  }
  if (!res.ok) throw new ApiError(res.status, (parsed['error'] as string) ?? 'unknown');
  return parsed as T;
}

export const api = {
  signIn: (email: string, password: string, code: string) =>
    request<{
      token?: string;
      operator?: Operator;
      enrolTotp?: { secret: string; uri: string };
      message?: string;
    }>('/operator/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password, code }),
    }),

  overview: () => request<OverviewView>('/operator/overview'),
  schools: () => request<{ schools: SchoolRow[] }>('/operator/schools'),
  school: (id: string) => request<SchoolDetail>(`/operator/schools/${id}`),
  saveCommercials: (id: string, input: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/operator/schools/${id}/commercials`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  devices: () => request<DevicesView>('/operator/devices'),
  billing: () => request<BillingView>('/operator/billing'),
  raiseInvoices: () =>
    request<{ raised: number }>('/operator/billing/raise', { method: 'POST' }),
  markPaid: (id: string, method: string) =>
    request<{ ok: boolean }>(`/operator/billing/${id}/paid`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    }),

  tickets: () => request<{ tickets: TicketRow[] }>('/operator/tickets'),
  ticket: (id: string) => request<TicketDetail>(`/operator/tickets/${id}`),
  reply: (id: string, body: string) =>
    request<{ ok: boolean }>(`/operator/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  updateTicket: (id: string, input: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/operator/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  system: () => request<SystemView>('/operator/system'),
  team: () => request<TeamView>('/operator/team'),
  audit: (schoolId?: string) =>
    request<{ entries: AuditEntry[] }>(
      `/operator/audit${schoolId ? `?schoolId=${schoolId}` : ''}`,
    ),
};

// --- shapes ----------------------------------------------------------------

export interface NeedsYouItem {
  kind: string;
  severity: 'critical' | 'warn' | 'info';
  schoolId?: string;
  ticketId?: string;
  title: string;
  detail: string;
}

export interface OverviewView {
  counts: {
    schoolsTotal: number;
    schoolsLive: number;
    busesTotal: number;
    busesReporting: number;
    children: number;
    mrrPaise: number;
  };
  needsYou: NeedsYouItem[];
}

export interface SchoolRow {
  id: string;
  name: string;
  city: string;
  plan: string;
  liveSince: string | null;
  trialEndsOn: string | null;
  buses: number;
  children: number;
  driverUsagePercent: number | null;
  parentAdoptionPercent: number | null;
  overdueDays: number;
  health: number | null;
  status: 'healthy' | 'at_risk' | 'devices' | 'payment' | 'trial';
}

export interface SchoolDetail {
  school: Record<string, unknown>;
  recentTrips: Record<string, unknown>[];
  openAlerts: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
}

export interface DevicesView {
  installs: Record<string, unknown>[];
  versions: { app: string; app_version: string; installs: number; active: number }[];
  problems: {
    pushDenied: number;
    locationNotAlways: number;
    batteryRestricted: number;
    silentAWeek: number;
  };
}

export interface InvoiceRow {
  id: string;
  number: string;
  school_name: string;
  school_id: string;
  buses: number;
  amount_paise: number;
  gst_paise: number;
  period: string;
  raised_on: string;
  due_on: string;
  status: 'open' | 'paid' | 'void';
  paid_method: string | null;
  days_late: number;
}

export interface BillingView {
  invoices: InvoiceRow[];
  totals: {
    mrrPaise: number;
    collectedPaise: number;
    overduePaise: number;
    openCount: number;
  };
}

export interface TicketRow {
  id: string;
  number: number;
  subject: string;
  priority: 'urgent' | 'normal';
  status: string;
  school_name: string;
  school_id: string;
  minutes_open: number;
  first_reply_at: string | null;
}

export interface TicketDetail {
  ticket: Record<string, unknown>;
  replies: { author: string; body: string; at: string }[];
  context: {
    child?: Record<string, unknown> | null;
    buses?: { plate: string; route_name: string; seconds_since_fix: number | null }[];
    similarThisMonth?: number;
  };
}

export interface SystemView {
  db: {
    sizeBytes: number;
    locationsBytes: number;
    partitions: number;
    oldestPartition: string | null;
    locationsToday: number;
    retentionOverdueMonths: number;
  };
}

export interface TeamView {
  team: {
    id: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
    last_seen_at: string | null;
    totp_enrolled: boolean;
  }[];
  grants: {
    id: string;
    operator_name: string;
    school_name: string;
    granted_at: string;
    expires_at: string;
    live: boolean;
  }[];
}

export interface AuditEntry {
  at: string;
  actor_email: string;
  action: string;
  subject: string | null;
  detail: Record<string, unknown>;
  ip: string | null;
  school_name: string | null;
}

// --- money -----------------------------------------------------------------

/**
 * Rule 8: money is integer paise everywhere it is stored or sent. It becomes a
 * rupee string exactly here, at the edge, and never travels back the other way.
 */
export function rupees(paise: number, opts: { lakh?: boolean } = {}): string {
  if (opts.lakh && paise >= 100_000_00) {
    return `₹${(paise / 100_000_00).toFixed(2)}L`;
  }
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}
