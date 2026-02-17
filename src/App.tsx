// src/App.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Field } from "./types";
import { fetchFieldData, fetchFields } from "./api";
import MapSection from "./components/MapSection";
import FieldDetailSection from "./components/FieldDetailSection";
import BottomSummarySection from "./components/BottomSummarySection.tsx";
import WorkerDataSection from "./components/WorkerDataSection";

const EMPTY_FIELDS: Field[] = [];

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const App = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const fieldsQuery = useQuery({
    queryKey: ["fields"],
    queryFn: ({ signal }) => fetchFields(signal),
    staleTime: 30_000,
  });
  const fields = fieldsQuery.data ?? EMPTY_FIELDS;

  const effectiveSelectedId =
    selectedId != null && fields.some((field) => field.id === selectedId)
      ? selectedId
      : fields[0]?.id;

  const selectedField = useMemo(
    () => fields.find((f) => f.id === effectiveSelectedId) ?? (fields[0] ?? null),
    [fields, effectiveSelectedId],
  );

  const fieldDataQuery = useQuery({
    queryKey: ["fieldData", selectedField?.id ?? ""],
    queryFn: ({ signal }) => fetchFieldData(selectedField!.id, signal),
    enabled: !!selectedField,
    staleTime: 10_000,
  });

  const data = fieldDataQuery.data ?? null;
  const loadingData = fieldDataQuery.isLoading || fieldDataQuery.isFetching;
  const dataError = fieldDataQuery.error ? toErrorMessage(fieldDataQuery.error) : null;

  const refresh = () => {
    if (!selectedField) return;
    void fieldDataQuery.refetch();
  };

  if (fieldsQuery.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        読み込み中…
      </div>
    );
  }

  if (fieldsQuery.isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 p-6">
        <div className="max-w-xl w-full bg-white border rounded-2xl p-6 space-y-4">
          <div className="text-red-600">
            データ取得に失敗しました: {toErrorMessage(fieldsQuery.error)}
          </div>
          <button
            className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50"
            onClick={() => void fieldsQuery.refetch()}
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

          <div className="flex-[5] min-w-0 min-h-0 flex flex-col gap-6">
            <div className="flex-[7] min-h-0 overflow-auto">
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
            <WorkerDataSection />
          </div>
        </div>
      </main>
    </div>
  );
};
export default App;
