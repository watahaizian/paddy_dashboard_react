// src/components/WorkerDataSection.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkers } from "../api";
import type { Worker } from "../types";

const EMPTY_WORKERS: Worker[] = [];

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const WorkerDataSection = () => {
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const workersQuery = useQuery({
    queryKey: ["workers"],
    queryFn: ({ signal }) => fetchWorkers(signal),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const workers = workersQuery.data ?? EMPTY_WORKERS;
  const loading = workersQuery.isLoading;
  const error = workersQuery.error
    ? `作業員データの取得に失敗しました: ${toErrorMessage(workersQuery.error)}`
    : null;

  const visibleSelectedWorker = selectedWorker == null
    ? null
    : workers.find((worker) => worker.id === selectedWorker.id) ?? null;

  const onlineBadgeClass = (isOnline: boolean) =>
    isOnline
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : "bg-slate-100 text-slate-600 border-slate-300";

  const onlineLabel = (isOnline: boolean) => (isOnline ? "オンライン" : "オフライン");

  return (
    <section className="relative flex-[3] min-h-[160px] bg-white border rounded-2xl p-4 overflow-hidden">
      <div className="font-bold text-slate-700">作業員データ</div>
      <div className="mt-3">
        {loading ? (
          <div className="text-slate-500 text-sm">読み込み中...</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : workers.length === 0 ? (
          <div className="text-slate-500 text-sm">作業員データがありません</div>
        ) : (
          <div className="divide-y">
            {workers.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWorker(w)}
                className="w-full text-left flex items-center gap-3 py-2 hover:bg-slate-50 rounded-lg px-1 transition-colors"
              >
                <img
                  src={w.photoUrl}
                  alt={w.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div className="flex-1 grid grid-cols-4 gap-3 text-sm items-center">
                  <div className="font-semibold text-slate-800">{w.name}</div>
                  <div className="text-slate-600">{w.area}</div>
                  <div className="text-slate-600">{w.method}</div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${onlineBadgeClass(w.isOnline)}`}
                    >
                      {onlineLabel(w.isOnline)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {visibleSelectedWorker != null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-3">
          {/* 画面全体ではなく作業員データ枠内に閉じたモーダルにするため、セクション内絶対配置にする。 */}
          <button
            type="button"
            aria-label="モーダルを閉じる"
            className="absolute inset-0 bg-slate-900/35"
            onClick={() => setSelectedWorker(null)}
          />
          <div className="relative w-full max-w-xl max-h-full overflow-auto rounded-xl border bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-slate-800">{visibleSelectedWorker.name}</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${onlineBadgeClass(visibleSelectedWorker.isOnline)}`}
                  >
                    {onlineLabel(visibleSelectedWorker.isOnline)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                onClick={() => setSelectedWorker(null)}
              >
                閉じる
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div className="text-slate-500">作業員ID</div>
                <div className="text-slate-800">{visibleSelectedWorker.id}</div>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div className="text-slate-500">担当エリア</div>
                <div className="text-slate-800">{visibleSelectedWorker.area}</div>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div className="text-slate-500">移動方法</div>
                <div className="text-slate-800">{visibleSelectedWorker.method}</div>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div className="text-slate-500">メールアドレス</div>
                <div className="text-slate-800">
                  {visibleSelectedWorker.contactEmail || "未設定"}
                </div>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div className="text-slate-500">電話番号</div>
                <div className="text-slate-800">
                  {visibleSelectedWorker.contactPhone || "未設定"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default WorkerDataSection;
