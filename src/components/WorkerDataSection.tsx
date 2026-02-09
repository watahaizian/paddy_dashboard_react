// src/components/WorkerDataSection.tsx
import { useEffect, useState } from "react";
import { fetchWorkers } from "../api";
import type { Worker } from "../types";

const isAbortError = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

const WorkerDataSection = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWorkers(ac.signal);
        if (alive) {
          setWorkers(data);
        }
      } catch (e) {
        if (!alive || isAbortError(e)) {
          return;
        }
        setError(`作業員データの取得に失敗しました: ${String(e)}`);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  return (
    <section className="flex-[3] min-h-[160px] bg-white border rounded-2xl p-4">
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
              <div key={w.id} className="flex items-center gap-3 py-2">
                <img
                  src={w.photoUrl}
                  alt={w.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                  <div className="font-semibold text-slate-800">{w.name}</div>
                  <div className="text-slate-600">{w.area}</div>
                  <div className="text-slate-600">{w.method}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkerDataSection;
