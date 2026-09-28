"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AssetStatus, Condition } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/lifecycle";
import { formatCompactINR } from "@/lib/utils";

/**
 * Chart colours kept consistent with StatusBadge / ConditionBadge tones so the
 * dashboard reads the same as the rest of the app (see docs/UI_SPEC.md).
 */
const STATUS_COLORS: Record<AssetStatus, string> = {
  PLANNED: "#94a3b8", // slate-400
  PROCURED: "#3b82f6", // blue-500
  IN_SERVICE: "#22c55e", // green-500
  UNDER_MAINTENANCE: "#f59e0b", // amber-500
  DECOMMISSIONED: "#f97316", // orange-500
  DISPOSED: "#6b7280", // gray-500
};

const CONDITION_COLORS: Record<Condition, string> = {
  EXCELLENT: "#059669", // emerald-600
  GOOD: "#22c55e", // green-500
  FAIR: "#eab308", // yellow-500
  POOR: "#f97316", // orange-500
  CRITICAL: "#dc2626", // red-600 (CRITICAL red per spec)
};

const INDIGO = "#4f46e5";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
} as const;

export function StatusPie({
  data,
}: {
  data: { status: AssetStatus; count: number }[];
}) {
  // Pre-map a friendly `label` so the tooltip/legend need no custom formatter.
  const rows = data
    .filter((d) => d.count > 0)
    .map((d) => ({ ...d, label: STATUS_LABELS[d.status] }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={90}
          // Recharts v3 label props are loosely typed; the slice datum is on `payload`.
          label={(entry: { payload?: { count?: number } }) =>
            String(entry.payload?.count ?? "")
          }
        >
          {rows.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CategoryBar({
  data,
}: {
  data: { category: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, top: 8, right: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Assets" fill={INDIGO} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DivisionBar({
  data,
}: {
  data: { division: string; count: number; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, top: 8, right: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="division"
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={70}
          tickFormatter={(v: string) => v.replace("R&B Division ", "")}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Assets" fill={INDIGO} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConditionBar({
  data,
}: {
  data: { condition: Condition; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -16, top: 8, right: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="condition" tick={{ fontSize: 10 }} interval={0} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Assets" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.condition} fill={CONDITION_COLORS[d.condition]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CostByMonth({
  data,
}: {
  data: { month: string; cost: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 8, top: 8, right: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10 }}
          tickFormatter={(v: string) => v.slice(2)}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          width={70}
          tickFormatter={(v: number) => formatCompactINR(v)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatCompactINR(Number(value)), "Cost"]}
        />
        <Line
          type="monotone"
          dataKey="cost"
          stroke={INDIGO}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
