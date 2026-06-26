"use client";

/**
 * Recharts wrappers for the admin analytics dashboard (spec §4.2). Each takes
 * already-computed, already-localized data from the server page. Charts render
 * LTR in both locales (data-viz convention); surrounding chrome is RTL-aware.
 *
 * The chart chrome (axis ticks, grid lines, tooltip card) adapts to the active
 * light/dark theme; the data-series colours read on both.
 */
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
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

const GREEN = "#18B66A"; // brand green (primary series)
const NAVY = "#6EA8FE"; // light navy-blue (secondary series — reads on both themes)
export const SERIES_COLORS = [
  "#18B66A",
  "#6EA8FE",
  "#E8B45E",
  "#A78BFA",
  "#F472B6",
  "#F87171",
  "#2DD4BF",
  "#FBBF24",
];

/** Theme-aware chart chrome (axis / grid / tooltip / legend / cursor). */
function useChartColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light"; // default to dark (the app default)
  const axis = dark ? "#97A1B7" : "#6B7280";
  const grid = dark ? "#232C42" : "#E5E7EB";
  return {
    axisTick: { fontSize: 11, fill: axis },
    grid,
    tooltip: {
      contentStyle: {
        background: dark ? "#121829" : "#FFFFFF",
        border: `1px solid ${dark ? "#232C42" : "#E5E7EB"}`,
        borderRadius: 12,
        color: dark ? "#E9EDF6" : "#111827",
        fontSize: 12,
        boxShadow: dark ? "0 16px 40px rgba(0,0,0,0.6)" : "0 10px 30px rgba(16,24,39,0.12)",
      },
      labelStyle: { color: axis },
      itemStyle: { color: dark ? "#E9EDF6" : "#111827" },
    },
    legend: { fontSize: 12, color: axis },
    barCursor: { fill: dark ? "rgba(255,255,255,0.04)" : "rgba(17,24,39,0.05)" },
  };
}

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
  const c = useChartColors();
  const rows = data.map((d) => ({ ...d, label: shortDay(d.date) }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" tick={c.axisTick} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={c.axisTick} allowDecimals={false} width={36} />
          <Tooltip {...c.tooltip} />
          <Legend wrapperStyle={c.legend} />
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
  const c = useChartColors();
  const rows = data.map((d) => ({ ...d, labelX: shortDay(d.week) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="labelX" tick={c.axisTick} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={c.axisTick} allowDecimals={false} width={36} />
          <Tooltip {...c.tooltip} cursor={c.barCursor} />
          <Bar dataKey="count" name={label} fill={GREEN} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data }: { data: { name: string; count: number }[] }) {
  const c = useChartColors();
  const locale = useLocale();

  // Sort by count descending
  const sorted = [...data].sort((a, b) => b.count - a.count);

  // Take top 6 categories, group the rest as "Other"
  const topLimit = 6;
  const topItems = sorted.slice(0, topLimit);
  const otherItems = sorted.slice(topLimit);
  const otherCount = otherItems.reduce((sum, item) => sum + item.count, 0);

  const chartData = [...topItems];
  if (otherCount > 0) {
    chartData.push({
      name: locale === "ar" ? "أخرى" : "Other",
      count: otherCount,
    });
  }

  return (
    <div className="flex flex-col items-center">
      <div className="h-64 w-full" style={{ direction: "ltr" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={3}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                  stroke="#121829"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip {...c.tooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom 2-column Legend */}
      <div className="w-full mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 px-2 border-t border-line/20 pt-4">
        {chartData.map((item, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          return (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="truncate text-muted font-medium" title={item.name}>{item.name}</span>
              <span className="ms-auto font-bold text-ink bg-elevated/40 px-1.5 py-0.5 rounded text-[10px]">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CityBarChart({ data }: { data: { name: string; count: number }[] }) {
  const c = useChartColors();

  // Sort and limit to top 10 cities for clean layout
  const chartData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const height = Math.max(160, chartData.length * 36 + 24);

  return (
    <div className="w-full" style={{ height, direction: "ltr" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <defs>
            <linearGradient id="cityBarGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#6EA8FE" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tick={c.axisTick} allowDecimals={false} stroke={c.grid} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ ...c.axisTick, textAnchor: "end" }}
            width={120}
            stroke={c.grid}
            tickLine={false}
          />
          <Tooltip {...c.tooltip} cursor={c.barCursor} />
          <Bar dataKey="count" fill="url(#cityBarGradient)" radius={[0, 6, 6, 0]} barSize={16} />
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
    { key: "proposals", label: labels.proposals, value: data.proposals, color: SERIES_COLORS[1] },
    { key: "agreed", label: labels.agreed, value: data.agreed, color: SERIES_COLORS[2] },
    { key: "completed", label: labels.completed, value: data.completed, color: GREEN },
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
