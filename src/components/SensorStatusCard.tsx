// src/components/SensorStatusCard.tsx
import { useEffect, useMemo, useState } from "react";
import type { Field, FieldDataResponse } from "../types";

type Props = {
  field: Field;
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

const SensorStatusCard = ({ field, data, loading, error }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);
  const last = data?.last;
  const sensorHealth = field.sensorHealth;
  const latestMs = sensorHealth?.latestMs ?? last?.t;

  const alertDetails = useMemo(() => {
    const details = [] as string[];
    if (sensorHealth?.noData) details.push("受信がありません");
    if (sensorHealth?.stale) details.push("10分間隔より長く受信が途切れています");
    if (sensorHealth?.allZero) details.push("最新データが全項目0です");
    if (sensorHealth?.sameAsPrev) details.push("最新データが前回と同一です");
    if (sensorHealth?.subBattery1Low) details.push("補助バッテリー1の電圧がしきい値以下です");
    if (sensorHealth?.subBattery2Low) details.push("補助バッテリー2の電圧がしきい値以下です");
    if (sensorHealth?.waterlevelDayDrop) details.push("24時間内の水位低下量がしきい値以上です");
    if (sensorHealth?.waterlevel1hRise) details.push("1時間内の水位上昇量がしきい値以上です");
    return details;
  }, [sensorHealth]);

  const hasAlert = field.sensorStatus === 4 || alertDetails.length > 0;
  const hasMultipleAlerts = alertDetails.length >= 2;
  // 異常理由が1件の時は即読できるように理由まで1行で出す。
  const singleAlertText = alertDetails.length === 1
    ? `センサ状態が異常です（${alertDetails[0]}）`
    : "センサ状態が異常です";

  useEffect(() => {
    // 異常件数が減ったときに古いモーダル表示が残らないようにする。
    if (!hasMultipleAlerts) {
      setModalOpen(false);
    }
  }, [hasMultipleAlerts]);

  return (
    <div className="relative h-full bg-slate-50 border rounded-xl p-3 overflow-hidden">
      <div className="font-bold">センサステータス</div>
      <div className="mt-2 space-y-2">
        {loading ? (
          <div className="py-6 text-center">読み込み中…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <>
            <Row label="最終受信" value={fmtDateTime(latestMs)} />
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
            {hasAlert && (
              <div className="pt-1 space-y-1">
                {!hasMultipleAlerts ? (
                  <div className="text-[12px] leading-tight text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {singleAlertText}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* 複数件はカード内モーダルにして、通常時の可読性を維持する。 */}
                    <button
                      type="button"
                      className="w-full text-left text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 hover:bg-red-100 transition cursor-pointer"
                      onClick={() => setModalOpen(true)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="leading-tight">センサ状態が異常です（{alertDetails.length}件）</span>
                        {/* 右端に押下の意図を示すことで、文言を増やさず操作性を上げる。 */}
                        <span className="shrink-0 text-[12px] leading-none underline decoration-red-500 decoration-1 underline-offset-2">
                          &gt;
                        </span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {hasMultipleAlerts && modalOpen && (
        <div
          className="absolute inset-0 z-10 bg-slate-900/30 p-3 flex items-center justify-center"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white border border-red-200 rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-red-100">
              <div className="text-sm font-semibold text-red-700">異常詳細（{alertDetails.length}件）</div>
              <button
                type="button"
                className="text-xs text-slate-600 hover:text-slate-800"
                onClick={() => setModalOpen(false)}
              >
                閉じる
              </button>
            </div>
            <div className="p-3 space-y-1 max-h-52 overflow-y-auto">
              {alertDetails.map((message) => (
                <div
                  key={message}
                  className="text-[12px] leading-tight text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1"
                >
                  {message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
