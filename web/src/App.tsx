// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import type { Field, FieldDataResponse } from "./types";
import { fetchFieldData, fetchFields } from "./api";
import MapSection from "./components/MapSection";
import FieldDetailSection from "./components/FieldDetailSection";
import BottomSummarySection from "./components/BottomSummarySection.tsx";

const isAbortError = (e: unknown) => {
  return e instanceof DOMException && e.name === "AbortError";
};

const App = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedId) ?? (fields[0] ?? null),
    [fields, selectedId]
  );

  const [data, setData] = useState<FieldDataResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    (async () => {
      setLoadingFields(true);
      setFieldsError(null);
      try {
        const f = await fetchFields(ac.signal);
        if (alive) {
          setFields(f);
          setSelectedId((prev) => prev ?? f[0]?.id);
        }
      } catch (e) {
        if (!alive || isAbortError(e)) {
          // ignore
        } else {
          setFieldsError(`データ取得に失敗しました: ${String(e)}`);
        }
      } finally {
        if (alive) {
          setLoadingFields(false);
        }
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  const loadData = (id: string) => {
    let alive = true;
    const ac = new AbortController();

    (async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const d = await fetchFieldData(id, ac.signal);
        if (alive) {
          setData(d);
        }
      } catch (e) {
        if (!alive || isAbortError(e)) {
          // ignore
        } else {
          setData(null);
          setDataError(String(e));
        }
      } finally {
        if (alive) {
          setLoadingData(false);
        }
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  };

  useEffect(() => {
    if (!selectedField) return;
    const cancel = loadData(selectedField.id);
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedField?.id]);

  const refresh = () => {
    if (!selectedField) return;
    loadData(selectedField.id);
  };

  if (loadingFields) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        読み込み中…
      </div>
    );
  }

  if (fieldsError) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 p-6">
        <div className="max-w-xl w-full bg-white border rounded-2xl p-6 space-y-4">
          <div className="text-red-600">{fieldsError}</div>
          <button
            className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50"
            onClick={() => location.reload()}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="h-16 bg-slate-800 text-white flex items-center px-6 font-black tracking-widest">
        圃場水管理ダッシュボード
      </header>

      <main className="px-8 py-6">
        <div className="block min-[960px]:hidden space-y-6">
          <div className="h-[40vh] min-h-[320px]">
            <MapSection
              fields={fields}
              selectedId={selectedField?.id}
              onSelect={(f: Field) => setSelectedId(f.id)}
            />
          </div>

          <div className="h-[200px]">
            <BottomSummarySection isCompact />
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 max-h-[50vh] overflow-auto">
              <FieldDetailSection
                isCompact
                field={selectedField}
                data={data}
                loading={loadingData}
                error={dataError}
                onRefresh={refresh}
                wrapContent
              />
            </div>
          </div>
        </div>

        <div className="hidden min-[960px]:flex gap-6 h-[calc(100vh-64px-48px)] min-h-0">
          <div className="flex-[7] min-w-0 flex flex-col gap-6 min-h-0">
            <div className="flex-1 min-h-0">
              <MapSection
                fields={fields}
                selectedId={selectedField?.id}
                onSelect={(f: Field) => setSelectedId(f.id)}
              />
            </div>
            <div className="h-[180px]">
              <BottomSummarySection isCompact={false} />
            </div>
          </div>

          <div className="flex-[5] min-w-0 min-h-0 overflow-auto">
            <FieldDetailSection
              isCompact={false}
              field={selectedField}
              data={data}
              loading={loadingData}
              error={dataError}
              onRefresh={refresh}
              wrapContent={false}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
export default App;
