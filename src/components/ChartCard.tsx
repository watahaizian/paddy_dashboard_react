// src/components/ChartCard.tsx
import { useMemo } from "react";
import type { FieldDataResponse } from "../types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";



type Kind = "waterCm" | "temp";

type Props = {
  title: string;
  unit: string;
  kind: Kind;
  data: FieldDataResponse | null;
  loading: boolean;
  error: string | null;
  chartHeightClass?: string;
};

const fmtHour = (ms: number) => {
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit" }).format(new Date(ms));
};

const colors = (kind: Kind) => {
  return kind === "temp"
    ? { stroke: "#f97316", fill: "#f97316" }
    : { stroke: "#3b82f6", fill: "#3b82f6" };
};

const ySpec = (kind: Kind) => {
  if (kind === "waterCm") {
    return { min: 0, max: 30, ticks: [0, 10, 20, 30] };
  }
  return { min: 0, max: 40, ticks: [0, 10, 20, 30, 40] };
};

type XDomain = readonly [number, number] | readonly ["dataMin", "dataMax"];

const make3HourTicks = (timesMs: number[]): { ticks: number[]; domain: XDomain } => {
  if (timesMs.length === 0) return { ticks: [] as number[], domain: ["dataMin", "dataMax"] as const };

  const min = Math.min(...timesMs);
  const max = Math.max(...timesMs);

  const start = new Date(min);
  start.setMinutes(0, 0, 0);
  start.setHours(Math.floor(start.getHours() / 3) * 3, 0, 0, 0);

  const end = new Date(max);
  end.setMinutes(0, 0, 0);
  const eh = end.getHours();
  const ceil = Math.ceil(eh / 3) * 3;
  if (ceil >= 24) {
    end.setHours(24, 0, 0, 0);
  } else {
    end.setHours(ceil, 0, 0, 0);
  }

  const ticks: number[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 3 * 60 * 60 * 1000) {
    ticks.push(t);
  }

  return { ticks, domain: [start.getTime(), end.getTime()] as const };
};

const ChartCard = ({
  title,
  unit,
  kind,
  data,
  loading,
  error,
  chartHeightClass = "min-h-[140px]",
}: Props) => {
  const points = data?.points ?? [];
  const lastPoint = points.length > 0 ? points[points.length - 1] : undefined;
  const lastValue = lastPoint ? lastPoint[kind] : undefined;

  const chartData = points.map((p) => ({
    t: Number(p.t),
    waterCm: p.waterCm,
    temp: p.temp,
  }));

  const { stroke, fill } = colors(kind);
  const { min: minY, max: maxY, ticks: yTicks } = ySpec(kind);

  const xTimes = useMemo(() => chartData.map((d) => d.t), [chartData]);
  const { ticks: xTicks, domain: xDomain } = useMemo(() => make3HourTicks(xTimes), [xTimes]);

  return (
    <div className="min-h-0 min-w-0 border rounded-xl p-3 flex flex-col bg-white">
      <div className="flex items-center gap-2">
        <div className="font-medium text-sm text-slate-600">{title}</div>
        <div className="flex-1" />
        {!loading && !error && points.length > 0 && lastValue != null && (
          <div className="font-semibold text-lg">
            {Number(lastValue).toFixed(1)} <span className="text-xs text-slate-500">{unit}</span>
          </div>
        )}
      </div>

      <div className={`mt-2 flex-1 min-h-0 min-w-0 border rounded-lg grid place-items-center ${chartHeightClass} relative overflow-hidden z-0 bg-slate-50`}>
        {loading ? (
          <div className="text-sm text-slate-400">読み込み中…</div>
        ) : error ? (
          <div className="text-red-600 text-center px-3 text-sm">{error}</div>
        ) : (
          <div className="w-full h-full overflow-hidden">
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={xDomain}
                    ticks={xTicks}
                    interval={0}
                    tickFormatter={(v) => fmtHour(Number(v))}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickMargin={4}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="number"
                    domain={[minY, maxY]}
                    ticks={yTicks}
                    interval={0}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickMargin={4}
                    allowDataOverflow
                  />

                  <RTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelFormatter={(v) =>
                      new Intl.DateTimeFormat("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(Number(v)))
                    }
                    formatter={(value: string | number | readonly (string | number)[] | undefined) => {
                      const v = Array.isArray(value) ? value[0] : value ?? NaN;
                      return [Number(v).toFixed(1) + unit, title];
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey={kind}
                    stroke={stroke}
                    strokeWidth={2}
                    fill={fill}
                    fillOpacity={0.1}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartCard;
