import type { FieldDataResponse } from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  title: string;
  data: FieldDataResponse | null;
  loading: boolean;
  error: string | null;
};

const fmtTime = (ms: number) => {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
};

const ChartsPanel = ({ title, data, loading, error }: Props) => {
  if (loading) {
    return (
      <div style={cardStyle}>
        <h3 style={h3Style}>{title}</h3>
        <div style={centerStyle}>読み込み中…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={cardStyle}>
        <h3 style={h3Style}>{title}</h3>
        <div style={{ ...centerStyle, color: "#d32f2f" }}>{error}</div>
      </div>
    );
  }
  if (!data || data.points.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={h3Style}>{title}</h3>
        <div style={centerStyle}>この期間のデータはありません。</div>
      </div>
    );
  }

  // recharts は undefined を描かないので、そのままOK
  const chartData = data.points.map((p) => ({
    t: p.t,
    waterCm: p.waterCm,
    temp: p.temp,
  }));

  return (
    <div style={cardStyle}>
      <h3 style={h3Style}>{title}</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, height: 320 }}>
        <div style={miniCardStyle}>
          <div style={miniTitle}>水位 (cm)</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis
                  dataKey="t"
                  tickFormatter={(v) => fmtTime(Number(v))}
                  minTickGap={24}
                />
                <YAxis />
                <RTooltip
                  labelFormatter={(v) => fmtTime(Number(v))}
                />
                <Line type="monotone" dataKey="waterCm" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={miniCardStyle}>
          <div style={miniTitle}>水温 (℃)</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis
                  dataKey="t"
                  tickFormatter={(v) => fmtTime(Number(v))}
                  minTickGap={24}
                />
                <YAxis />
                <RTooltip
                  labelFormatter={(v) => fmtTime(Number(v))}
                />
                <Line type="monotone" dataKey="temp" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChartsPanel;

const cardStyle: React.CSSProperties = {
  border: "1px solid #BFCBDA",
  borderRadius: 16,
  background: "white",
  padding: 16,
};

const h3Style: React.CSSProperties = {
  margin: 0,
  marginBottom: 12,
  fontSize: 16,
  fontWeight: 800,
};

const centerStyle: React.CSSProperties = {
  height: 120,
  display: "grid",
  placeItems: "center",
  color: "#455A64",
};

const miniCardStyle: React.CSSProperties = {
  border: "1px solid #BFCBDA",
  borderRadius: 12,
  padding: 12,
};

const miniTitle: React.CSSProperties = {
  fontWeight: 800,
  marginBottom: 8,
};
