// src/components/SensorStatusCard.tsx
import type { FieldDataResponse } from "../types";

type Props = {
  data: FieldDataResponse | null;
  loading: boolean;
  error: string | null;
};

const fmtDateTime = (ms?: number) => {
  if (!ms) return "--";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
};

const SensorStatusCard = ({ data, loading, error }: Props) => {
  const last = data?.last;

  return (
    <div className="h-full bg-slate-50 border rounded-xl p-3">
      <div className="font-bold">センサステータス</div>
      <div className="mt-2 space-y-2">
        {loading ? (
          <div className="py-6 text-center">読み込み中…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : !data || data.points.length === 0 ? (
          <div>この期間のデータはありません。</div>
        ) : (
          <>
            <Row label="最終受信" value={fmtDateTime(last?.t)} />
            <Row
              label="水位"
              value={last?.waterCm != null ? `${last.waterCm.toFixed(1)} cm` : "--"}
            />
            <Row
              label="水温"
              value={last?.temp != null ? `${last.temp.toFixed(1)} ℃` : "--"}
            />
            <Row
              label="電池残量"
              value={last?.battery != null ? `${last.battery.toFixed(0)} %` : "--"}
            />
          </>
        )}
      </div>
    </div>
  );
};
export default SensorStatusCard;

const Row = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="text-slate-600">{label}：</div>
      <div className="font-medium">{value}</div>
    </div>
  );
};
