"use client";

/**
 * Recharts wrappers for the admin analytics dashboard (spec §4.2). Each takes
 * already-computed, already-localized data from the server page. Charts render
 * LTR in both locales (data-viz convention); surrounding chrome is RTL-aware.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GREEN = "#18B66A";
const NAVY = "#0B1324";
const AXIS = "#6B7280";
const GRID = "#E5E7EB";
export const SERIES_COLORS = [
  "#18B66A",
  "#0B1324",
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#14B8A6",
  "#EC4899",
];

const AXIS_TICK = { fontSize: 11, fill: AXIS };

/** Short month-day label (MM-DD) for a YYYY-MM-DD key. */
function shortDay(d: string): string {
  return d.length >= 10 ? d.slice(5) : d;
}

export function Sparkline({ data, color = GREEN }: { data: number[]; color?: string }) {
  if (!data.length) return <div className="h-10" />;
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyLineChart({
  data,
  usersLabel,
  listingsLabel,
}: {
  data: { date: string; users: number; listings: number }[];
  usersLabel: string;
  listingsLabel: string;
}) {
  const rows = data.map((d) => ({ ...d, label: shortDay(d.date) }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={AXIS_TICK} allowDecimals={false} width={36} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="users" name={usersLabel} stroke={GREEN} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="listings" name={listingsLabel} stroke={NAVY} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyBarChart({
  data,
  label,
}: {
  data: { week: string; count: number }[];
  label: string;
}) {
  const rows = data.map((d) => ({ ...d, labelX: shortDay(d.week) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="labelX" tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXIS_TICK} allowDecimals={false} width={36} />
          <Tooltip />
          <Bar dataKey="count" name={label} fill={GREEN} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data }: { data: { name: string; count: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" innerRadius={56} outerRadius={92} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CityBarChart({ data }: { data: { name: string; count: number }[] }) {
  const height = Math.max(160, data.length * 36 + 24);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={96} />
          <Tooltip />
          <Bar dataKey="count" fill={NAVY} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Three-stage funnel rendered as proportional bars (RTL-safe, no chart lib needed). */
export function ProposalFunnel({
  data,
  labels,
}: {
  data: { proposals: number; agreed: number; completed: number };
  labels: { proposals: string; agreed: string; completed: string };
}) {
  const max = Math.max(data.proposals, 1);
  const stages = [
    { key: "proposals", label: labels.proposals, value: data.proposals, color: SERIES_COLORS[3] },
    { key: "agreed", label: labels.agreed, value: data.agreed, color: GREEN },
    { key: "completed", label: labels.completed, value: data.completed, color: NAVY },
  ];
  return (
    <div className="space-y-3 py-2">
      {stages.map((s) => {
        const pct = Math.round((s.value / max) * 100);
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">{s.label}</span>
              <span className="font-bold text-ink">{s.value}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-pill bg-canvas">
              <div className="h-full rounded-pill" style={{ width: `${pct}%`, backgroundColor: s.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
